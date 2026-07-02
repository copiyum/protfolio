"use server";
import { cookies, headers } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { writeAudit } from "../audit";
import { makeRegistrationOptions, verifyRegistration, makeAuthOptions, verifyAuth } from "../passkey";
import { signSession, verifySession } from "../session";
import { consume } from "../ratelimit";
import { alert } from "../alerts";
import { verifyTurnstile } from "../turnstile";

const COOKIE_NAME = "__Host-pf_admin";
const SESSION_TTL_MS = 15 * 60 * 1000;

interface AdminEnv {
  DB: D1Database;
  ADMIN_COOKIE_SECRET: string;
  TURNSTILE_SECRET: string;
  ALERT_EMAIL_WEBHOOK?: string;
}

async function getEnv(): Promise<AdminEnv> {
  const ctx = await getCloudflareContext({ async: true });
  return ctx.env as unknown as AdminEnv;
}

// Registration flows:
//   "bootstrap" — first-ever passkey setup. Only succeeds if the passkeys
//                 table is empty. Reached via /admin/setup, which is in the
//                 middleware's PUBLIC_ADMIN_PATHS so CF-Access-passed users
//                 can hit it before they have credentials.
//   "add"       — adding an additional passkey to an existing account.
//                 Requires an active session cookie. Reached via
//                 /admin/passkeys/register (gated by middleware).
export type RegistrationMode = "bootstrap" | "add";

async function assertBootstrapPossible(env: AdminEnv): Promise<void> {
  const row = await env.DB
    .prepare("SELECT EXISTS(SELECT 1 FROM passkeys LIMIT 1) AS has_any")
    .first<{ has_any: number }>();
  if (row?.has_any) {
    throw new Error("Already set up — sign in to add more passkeys.");
  }
}

async function assertAddSession(env: AdminEnv): Promise<{ credentialId: string }> {
  const jar = await cookies();
  const cookie = jar.get(COOKIE_NAME)?.value;
  if (!cookie) throw new Error("Sign in required to add a passkey.");
  const session = await verifySession(cookie, env.ADMIN_COOKIE_SECRET);
  if (!session) throw new Error("Session expired — sign in again.");
  return { credentialId: session.credentialId };
}

// Encode a Uint8Array as base64url. Both @simplewebauthn/server's helpers and
// Buffer's "base64url" encoding produce the same wire format, but Buffer is
// available natively in the Worker runtime.
function b64u(buf: Uint8Array): string {
  return Buffer.from(buf).toString("base64url");
}

export async function beginRegistration(mode: RegistrationMode = "add") {
  const env = await getEnv();
  if (mode === "bootstrap") {
    // Advisory check — the atomic insert in completeRegistration is the
    // real security guarantee; this is just a friendly early bail.
    await assertBootstrapPossible(env);
  } else {
    await assertAddSession(env);
  }
  const opts = await makeRegistrationOptions();
  // Server action boundary: Next.js serializes the returned value as JSON, but
  // PublicKeyCredentialCreationOptions contains Uint8Array fields which JSON
  // can't represent. Convert binary fields to base64url up front so the
  // browser-side @simplewebauthn/browser startRegistration() can decode them.
  const json = {
    challenge: b64u(opts.challenge),
    rp: opts.rp,
    user: { id: b64u(opts.user.id), name: opts.user.name, displayName: opts.user.displayName },
    pubKeyCredParams: opts.pubKeyCredParams,
    timeout: opts.timeout,
    excludeCredentials: opts.excludeCredentials?.map((c) => ({
      id: b64u(c.id),
      type: c.type,
      transports: c.transports,
    })),
    authenticatorSelection: opts.authenticatorSelection,
    attestation: opts.attestation,
    extensions: opts.extensions,
    hints: opts.hints,
  };
  const jar = await cookies();
  jar.set("pf_reg_challenge", b64u(opts.challenge), {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/admin",
    maxAge: 300,
  });
  return json;
}

export async function completeRegistration(formData: FormData, mode: RegistrationMode = "add") {
  const env = await getEnv();
  const jar = await cookies();
  const hdrs = await headers();
  const ip = (formData.get("ip") as string | null) ?? hdrs.get("cf-connecting-ip") ?? "unknown";
  const ua = hdrs.get("user-agent") ?? undefined;

  // L5 — Turnstile (before rate-limit so bot failures don't consume ceremony slots).
  const turnstileToken = formData.get("cf-turnstile-response") as string | null;
  const ts = await verifyTurnstile(turnstileToken, ip, env.TURNSTILE_SECRET);
  if (!ts.ok) {
    await writeAudit(env.DB, { action: "turnstile_failed", targetTable: "passkeys", ip, ua, diff: { stage: "register", reason: ts.reason } });
    throw new Error("Bot challenge failed");
  }

  // Bootstrap flow must gate before WebAuthn verify too — otherwise an attacker
  // can burn CPU on the verify path even if they can't insert.
  const sessionForAudit = mode === "add" ? await assertAddSession(env) : null;

  const responseStr = formData.get("response") as string;
  const name = formData.get("name") as string;
  const challenge = jar.get("pf_reg_challenge")?.value;
  if (!challenge) throw new Error("Registration challenge expired");
  const verified = await verifyRegistration(JSON.parse(responseStr), challenge);
  if (!verified.verified) throw new Error("Registration failed");
  const reg = verified.registrationInfo;
  if (!reg) throw new Error("No registration info");
  const credentialId = reg.credential.id;
  const publicKey = reg.credential.publicKey;
  const counter = reg.credential.counter;
  const transports = JSON.stringify(reg.credential.transports ?? []);

  // Atomic insert with bootstrap guard. WHERE NOT EXISTS collapses the
  // count-check + insert into a single SQL statement so two concurrent
  // bootstrap attempts can't both succeed (the second sees changes=0).
  const insertSql =
    mode === "bootstrap"
      ? `INSERT INTO passkeys (credential_id, public_key, counter, transports, name)
         SELECT ?, ?, ?, ?, ?
         WHERE NOT EXISTS (SELECT 1 FROM passkeys LIMIT 1)`
      : `INSERT INTO passkeys (credential_id, public_key, counter, transports, name)
         VALUES (?, ?, ?, ?, ?)`;
  const result = await env.DB.prepare(insertSql)
    .bind(credentialId, publicKey, counter, transports, name)
    .run();
  if (mode === "bootstrap" && (!result.meta || result.meta.changes === 0)) {
    // Lost the race — another passkey was registered while we were
    // verifying the WebAuthn response. Don't issue a session.
    throw new Error("Already set up — sign in to add more passkeys.");
  }

  jar.delete("pf_reg_challenge");
  await writeAudit(env.DB, {
    action: "passkey_register",
    targetTable: "passkeys",
    targetId: credentialId,
    actorCredentialId: mode === "add" ? sessionForAudit!.credentialId : credentialId,
    ip,
    ua,
  });
  await issueSession(credentialId, env);
  return { ok: true, credentialId };
}

export async function beginLogin() {
  const env = await getEnv();
  const rows = await env.DB.prepare(
    "SELECT credential_id, public_key, counter, transports FROM passkeys",
  ).all<{
    credential_id: string;
    public_key: ArrayBuffer;
    counter: number;
    transports: string;
  }>();
  const passkeys = rows.results.map((r) => ({
    credential_id: r.credential_id,
    public_key: new Uint8Array(r.public_key),
    counter: r.counter,
    transports: JSON.parse(r.transports),
  }));
  const opts = await makeAuthOptions(passkeys);
  // Serialize to *JSON form (base64url Uint8Arrays) so the client can decode
  // and pass to startAuthentication() without losing the binary fields.
  const json = {
    challenge: b64u(opts.challenge),
    rpId: opts.rpId,
    timeout: opts.timeout,
    userVerification: opts.userVerification,
    allowCredentials: opts.allowCredentials?.map((c) => ({
      id: b64u(c.id),
      type: c.type,
      transports: c.transports,
    })),
    extensions: opts.extensions,
    hints: opts.hints,
  };
  const jar = await cookies();
  jar.set("pf_assert_challenge", b64u(opts.challenge), {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/admin",
    maxAge: 300,
  });
  return json;
}

export async function completeLogin(formData: FormData) {
  const env = await getEnv();
  const jar = await cookies();
  const hdrs = await headers();
  const ip = (formData.get("ip") as string | null) ?? hdrs.get("cf-connecting-ip") ?? "unknown";
  const ua = hdrs.get("user-agent") ?? undefined;

  // L5 — Turnstile (before rate-limit so bot failures don't consume ceremony slots).
  const turnstileToken = formData.get("cf-turnstile-response") as string | null;
  const ts = await verifyTurnstile(turnstileToken, ip, env.TURNSTILE_SECRET);
  if (!ts.ok) {
    await writeAudit(env.DB, { action: "turnstile_failed", targetTable: "sessions", ip, ua, diff: { stage: "login", reason: ts.reason } });
    throw new Error("Bot challenge failed");
  }

  const allowed = await consume(env.DB, `ip:${ip}:/admin/login`, 5, 3600);
  if (!allowed) {
    await alert(env, "Admin login lockout", `IP ${ip} locked for 1h after 5 failed attempts`);
    throw new Error("Too many failed attempts");
  }
  const responseStr = formData.get("response") as string;
  const challenge = jar.get("pf_assert_challenge")?.value;
  if (!challenge) throw new Error("Login challenge expired");
  const response = JSON.parse(responseStr);
  const row = await env.DB.prepare(
    "SELECT credential_id, public_key, counter, transports FROM passkeys WHERE credential_id = ?",
  )
    .bind(response.id)
    .first<{
      credential_id: string;
      public_key: ArrayBuffer;
      counter: number;
      transports: string;
    }>();
  if (!row) throw new Error("Unknown credential");
  const passkey = {
    credential_id: row.credential_id,
    public_key: new Uint8Array(row.public_key),
    counter: row.counter,
    transports: JSON.parse(row.transports),
  };
  const verified = await verifyAuth(response, challenge, passkey);
  if (!verified.verified) throw new Error("Login failed");
  if (verified.authenticationInfo.newCounter <= passkey.counter) {
    // Counter regression = possible cloned authenticator. Delete + alert.
    await env.DB.prepare("DELETE FROM passkeys WHERE credential_id = ?").bind(passkey.credential_id).run();
    await writeAudit(env.DB, {
      action: "passkey_clone_detected",
      targetTable: "passkeys",
      targetId: passkey.credential_id,
      ip,
      ua,
    });
    await alert(env, "Passkey clone suspected", `Credential ${passkey.credential_id.slice(0, 12)}… deleted; counter regression from ${passkey.counter} → ${verified.authenticationInfo.newCounter}`);
    throw new Error("Possible cloned authenticator; credential deleted");
  }
  await env.DB.prepare(
    "UPDATE passkeys SET counter = ?, last_used_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE credential_id = ?",
  )
    .bind(verified.authenticationInfo.newCounter, passkey.credential_id)
    .run();
  jar.delete("pf_assert_challenge");
  await issueSession(passkey.credential_id, env);
  await writeAudit(env.DB, { action: "login_success", actorCredentialId: passkey.credential_id, ip, ua });

  // Open redirect guard
  const next = formData.get("next") as string | null;
  const safeNext = next && /^\/admin(\/.*)?$/.test(next) ? next : "/admin";
  return { ok: true, redirect: safeNext };
}

async function issueSession(credentialId: string, env: AdminEnv) {
  const exp = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const nonce = crypto.randomUUID();
  const cookie = await signSession({ credentialId, expiresAt: exp, nonce }, env.ADMIN_COOKIE_SECRET);
  const jar = await cookies();
  jar.set(COOKIE_NAME, cookie, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/admin",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function logout() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

// re-export for tests / consumers
export { verifySession };