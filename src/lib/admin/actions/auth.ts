"use server";
import { cookies } from "next/headers";
import { prepareAudit, writeAudit } from "../audit";
import { makeRegistrationOptions, verifyRegistration, makeAuthOptions, verifyAuth } from "../passkey";
import { verifySession } from "../session";
import { adminTextEncoder, b64urlDecode, b64urlEncode, hmacKey } from "../crypto";
import { consume, isBlocked, reset } from "../ratelimit";
import { alert } from "../alerts";
import { verifyTurnstile } from "../turnstile";
import { createAuthGuard } from "../auth-guard";
import { adminActionError } from "./result";
import { assertStrongSecret } from "@/lib/security";
import {
  ADMIN_COOKIE_NAME as COOKIE_NAME,
  ADMIN_SESSION_TTL_MS as SESSION_TTL_MS,
  clearSessionCookie,
  requireActionAdmin,
  requireCfAccessForAction,
  type ActionAdminEnv,
  type ActionRequestMeta,
} from "./_security";

type AdminEnv = ActionAdminEnv & { TURNSTILE_SECRET: string };

function requireTurnstileSecret(env: ActionAdminEnv): string {
  return assertStrongSecret("TURNSTILE_SECRET", env.TURNSTILE_SECRET);
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
type AdminDataResult<T> = { ok: true; data: T } | { ok: false; error: string };

type RegistrationChallenge = {
  challenge: string;
  mode: RegistrationMode;
  sessionId: string | null;
  expiresAt: number;
};

async function signRegistrationChallenge(payload: RegistrationChallenge, secret: string): Promise<string> {
  const body = b64urlEncode(JSON.stringify(payload));
  const mac = await crypto.subtle.sign("HMAC", await hmacKey(secret, ["sign"]), adminTextEncoder.encode(body));
  return `${body}.${b64urlEncode(mac)}`;
}

async function verifyRegistrationChallenge(value: string, secret: string): Promise<RegistrationChallenge | null> {
  const [body, signature] = value.split(".");
  if (!body || !signature) return null;
  let given: Uint8Array;
  try {
    given = b64urlDecode(signature);
  } catch {
    return null;
  }
  const valid = await crypto.subtle.verify(
    "HMAC",
    await hmacKey(secret, ["verify"]),
    given.slice().buffer as ArrayBuffer,
    adminTextEncoder.encode(body),
  );
  if (!valid) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body))) as RegistrationChallenge;
    if (
      typeof payload.challenge !== "string"
      || (payload.mode !== "bootstrap" && payload.mode !== "add")
      || (payload.sessionId !== null && typeof payload.sessionId !== "string")
      || typeof payload.expiresAt !== "number"
      || payload.expiresAt < Date.now()
    ) return null;
    return payload;
  } catch {
    return null;
  }
}

async function dataAction<T>(fn: () => Promise<T>): Promise<AdminDataResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    return { ok: false, error: adminActionError(error) };
  }
}

async function assertBootstrapPossible(env: AdminEnv): Promise<void> {
  const row = await env.DB
    .prepare("SELECT EXISTS(SELECT 1 FROM passkeys LIMIT 1) AS has_any")
    .first<{ has_any: number }>();
  if (row?.has_any) {
    throw new Error("Already set up — sign in to add more passkeys.");
  }
}

function validatePasskeyName(value: FormDataEntryValue | null): string {
  const name = typeof value === "string" ? value.trim() : "";
  if (!name || name.length > 100) throw new Error("Passkey name must be 1-100 characters");
  return name;
}

export async function beginRegistration(mode: RegistrationMode = "add") {
  let auth: Awaited<ReturnType<typeof requireCfAccessForAction>>;
  let sessionId: string | null = null;
  if (mode === "bootstrap") {
    auth = await requireCfAccessForAction();
  } else {
    const admin = await requireActionAdmin({ fresh: true });
    auth = admin;
    sessionId = admin.session.sessionId ?? null;
  }
  const env = auth.env as AdminEnv;
  if (mode === "bootstrap") {
    // Advisory check — the atomic insert in completeRegistration is the
    // real security guarantee; this is just a friendly early bail.
    await assertBootstrapPossible(env);
  }
  const opts = await makeRegistrationOptions();
  if (mode === "add" && !sessionId) throw new Error("Registration requires an active stored session");
  const jar = await cookies();
  jar.set("pf_reg_challenge", await signRegistrationChallenge({
    challenge: opts.challenge,
    mode,
    sessionId,
    expiresAt: Date.now() + 300_000,
  }, env.ADMIN_COOKIE_SECRET), {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/admin",
    maxAge: 300,
  });
  return opts;
}

export async function beginRegistrationAction(mode: RegistrationMode = "add") {
  return dataAction(() => beginRegistration(mode));
}

export async function completeRegistration(formData: FormData, mode: RegistrationMode = "add") {
  let auth: Awaited<ReturnType<typeof requireCfAccessForAction>>;
  let actorCredentialId: string | undefined;
  let registrationSessionId: string | null = null;
  if (mode === "bootstrap") {
    auth = await requireCfAccessForAction({ write: true });
  } else {
    const admin = await requireActionAdmin({ write: true, fresh: true });
    auth = admin;
    actorCredentialId = admin.credentialId;
    registrationSessionId = admin.session.sessionId ?? null;
  }
  const env = auth.env as AdminEnv;
  const jar = await cookies();
  const clientIp = auth.meta.ip;
  const auditIp = auth.meta.storageIp;
  const ua = auth.meta.ua;

  // L5 — Turnstile (before rate-limit so bot failures don't consume ceremony slots).
  const turnstileToken = formData.get("cf-turnstile-response") as string | null;
  const ts = await verifyTurnstile(turnstileToken, clientIp, requireTurnstileSecret(env), {
    action: "register",
    hostname: auth.meta.host,
  });
  if (!ts.ok) {
    await writeAudit(env.DB, { action: "turnstile_failed", targetTable: "passkeys", ip: auditIp, ua, diff: { stage: "register", reason: ts.reason } });
    throw new Error("Bot challenge failed");
  }

  // Bootstrap flow must gate before WebAuthn verify too — otherwise an attacker
  // can burn CPU on the verify path even if they can't insert.
  if (mode === "bootstrap") await assertBootstrapPossible(env);
  const responseStr = formData.get("response") as string;
  const name = validatePasskeyName(formData.get("name"));
  const challengeCookie = jar.get("pf_reg_challenge")?.value;
  const ceremony = challengeCookie
    ? await verifyRegistrationChallenge(challengeCookie, env.ADMIN_COOKIE_SECRET)
    : null;
  if (
    !ceremony
    || ceremony.mode !== mode
    || ceremony.sessionId !== registrationSessionId
  ) throw new Error("Registration challenge expired or belongs to another session");
  const verified = await verifyRegistration(JSON.parse(responseStr), ceremony.challenge);
  if (!verified.verified) throw new Error("Registration failed");
  const reg = verified.registrationInfo;
  if (!reg) throw new Error("No registration info");
  const credentialId = String(reg.credential.id);
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
  const insert = env.DB.prepare(insertSql).bind(credentialId, publicKey, counter, transports, name);
  const audit = prepareAudit(env.DB, {
    action: "passkey_register",
    targetTable: "passkeys",
    targetId: credentialId,
    actorCredentialId: actorCredentialId ?? credentialId,
    ip: auditIp,
    ua,
  });
  const result = mode === "bootstrap"
    ? await insert.run()
    : (await env.DB.batch([insert, audit.statement]))[0];
  if (mode === "bootstrap" && (!result.meta || result.meta.changes === 0)) {
    // Lost the race — another passkey was registered while we were
    // verifying the WebAuthn response. Don't issue a session.
    throw new Error("Already set up — sign in to add more passkeys.");
  }

  jar.set("pf_reg_challenge", "", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/admin",
    maxAge: 0,
  });
  if (mode === "bootstrap") await audit.statement.run();
  await issueSession(credentialId, env, auth.meta);
  return { ok: true, credentialId };
}

export async function completeRegistrationAction(formData: FormData, mode: RegistrationMode = "add") {
  return dataAction(() => completeRegistration(formData, mode));
}

export async function beginLogin() {
  const { env } = await requireCfAccessForAction();
  const row = await env.DB.prepare("SELECT COUNT(*) AS c FROM passkeys").first<{ c: number }>();
  if (!row || row.c === 0) {
    throw new Error("No passkeys registered. Visit /admin/setup to register one.");
  }
  const opts = await makeAuthOptions();
  const jar = await cookies();
  jar.set("pf_assert_challenge", opts.challenge, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/admin",
    maxAge: 300,
  });
  return opts;
}

export async function beginLoginAction() {
  return dataAction(beginLogin);
}

export async function completeLogin(formData: FormData) {
  const { env, meta } = await requireCfAccessForAction({ write: true });
  const adminEnv = env as AdminEnv;
  const jar = await cookies();
  const clientIp = meta.ip;
  const auditIp = meta.storageIp;
  const ua = meta.ua;

  // L5 — Turnstile (before rate-limit so bot failures don't consume ceremony slots).
  const turnstileToken = formData.get("cf-turnstile-response") as string | null;
  const ts = await verifyTurnstile(turnstileToken, clientIp, requireTurnstileSecret(adminEnv), {
    action: "login",
    hostname: meta.host,
  });
  if (!ts.ok) {
    await writeAudit(env.DB, { action: "turnstile_failed", targetTable: "sessions", ip: auditIp, ua, diff: { stage: "login", reason: ts.reason } });
    throw new Error("Bot challenge failed");
  }

  const failureKey = `${auditIp}:/admin/login`;
  if (await isBlocked(env.DB, failureKey, 5, 3600)) {
    await alert(env, "Admin login lockout", `${auditIp} locked for 1h after 5 failed attempts`);
    throw new Error("Too many failed attempts. Wait 1 hour and try again.");
  }

  let passkeyCredentialId: string;
  try {
    const responseStr = formData.get("response") as string;
    const challenge = jar.get("pf_assert_challenge")?.value;
    if (!challenge) throw new Error("Passkey challenge expired. Refresh and try again.");
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
    if (!row) throw new Error("This passkey isn't registered with this site. Try a different passkey or register one at /admin/setup.");
    const passkey = {
      credential_id: row.credential_id,
      public_key: new Uint8Array(row.public_key),
      counter: row.counter,
      transports: JSON.parse(row.transports),
    };
    const verified = await verifyAuth(response, challenge, passkey);
    if (!verified.verified) throw new Error("Passkey verification failed. Make sure you're using the correct passkey and try again.");

    const newCounter = verified.authenticationInfo.newCounter;
    if (passkey.counter > 0 && newCounter > 0 && newCounter <= passkey.counter) {
      // Counter regression = possible cloned authenticator. Delete + alert.
      const audit = prepareAudit(env.DB, {
        action: "passkey_clone_detected",
        targetTable: "passkeys",
        targetId: passkey.credential_id,
        ip: auditIp,
        ua,
      });
      await env.DB.batch([
        env.DB.prepare("DELETE FROM sessions WHERE passkey_credential_id = ?").bind(passkey.credential_id),
        env.DB.prepare("DELETE FROM passkeys WHERE credential_id = ?").bind(passkey.credential_id),
        audit.statement,
      ]);
      await alert(env, "Passkey clone suspected", `Credential ${passkey.credential_id.slice(0, 12)} deleted; counter regression from ${passkey.counter} to ${newCounter}`);
      throw new Error("Possible cloned authenticator; credential deleted");
    }

    await env.DB.prepare(
      "UPDATE passkeys SET counter = ?, last_used_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE credential_id = ?",
    )
      .bind(Math.max(newCounter, passkey.counter), passkey.credential_id)
      .run();
    passkeyCredentialId = passkey.credential_id;
  } catch (e) {
    await consume(env.DB, failureKey, 5, 3600);
    if (await isBlocked(env.DB, failureKey, 5, 3600)) {
      await alert(env, "Admin login lockout", `${auditIp} locked for 1h after 5 failed attempts`);
    } else {
      const row = await env.DB.prepare("SELECT count FROM rate_limits WHERE scope_key = ?").bind(failureKey).first<{ count: number }>();
      const remaining = Math.max(0, 5 - (row?.count ?? 0));
      if (e instanceof Error && remaining > 0) {
        e.message = `${e.message} (${remaining} attempt${remaining === 1 ? "" : "s"} remaining before 1h lockout)`;
      }
    }
    throw e;
  }

  await reset(env.DB, failureKey);
  jar.set("pf_assert_challenge", "", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/admin",
    maxAge: 0,
  });
  await issueSession(passkeyCredentialId, adminEnv, meta);
  await writeAudit(env.DB, { action: "login_success", actorCredentialId: passkeyCredentialId, ip: auditIp, ua });

  // Open redirect guard
  const next = formData.get("next") as string | null;
  const safeNext = next && /^\/admin(\/.*)?$/.test(next) ? next : "/admin";
  return { ok: true, redirect: safeNext };
}

export async function completeLoginAction(formData: FormData) {
  return dataAction(() => completeLogin(formData));
}

async function issueSession(credentialId: string, env: AdminEnv, meta: ActionRequestMeta) {
  const session = await createAuthGuard(env).issueSession(credentialId, meta);
  const jar = await cookies();
  jar.set(COOKIE_NAME, session.cookie, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function logout() {
  const jar = await cookies();
  const cookie = jar.get(COOKIE_NAME)?.value;
  let env: ActionAdminEnv | null = null;
  try {
    ({ env } = await requireCfAccessForAction());
  } catch {
    env = null;
  }
  if (cookie && env?.ADMIN_COOKIE_SECRET) {
    const session = await verifySession(cookie, env.ADMIN_COOKIE_SECRET);
    if (session?.sessionId) {
      await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(session.sessionId).run();
    }
  }
  await clearSessionCookie();
}

// re-export for tests / consumers
export { verifySession };
