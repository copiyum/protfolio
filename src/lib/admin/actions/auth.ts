"use server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { writeAudit } from "../audit";
import { makeRegistrationOptions, verifyRegistration, makeAuthOptions, verifyAuth } from "../passkey";
import { signSession, verifySession } from "../session";
import { consume } from "../ratelimit";
import { alert } from "../alerts";

const COOKIE_NAME = "__Host-pf_admin";
const SESSION_TTL_MS = 15 * 60 * 1000;

interface AdminEnv {
  DB: D1Database;
  ADMIN_COOKIE_SECRET: string;
  ALERT_EMAIL_WEBHOOK?: string;
}

async function getEnv(): Promise<AdminEnv> {
  const ctx = await getCloudflareContext({ async: true });
  return ctx.env as unknown as AdminEnv;
}

export async function beginRegistration() {
  const opts = await makeRegistrationOptions();
  const challenge = Buffer.from(opts.challenge).toString("base64url");
  const jar = await cookies();
  jar.set("pf_reg_challenge", challenge, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/admin",
    maxAge: 300,
  });
  return opts;
}

export async function completeRegistration(formData: FormData) {
  const env = await getEnv();
  const jar = await cookies();
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
  await env.DB.prepare(
    "INSERT INTO passkeys (credential_id, public_key, counter, transports, name) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(credentialId, publicKey, counter, JSON.stringify(reg.credential.transports ?? []), name)
    .run();
  jar.delete("pf_reg_challenge");
  await writeAudit(env.DB, {
    action: "passkey_register",
    targetTable: "passkeys",
    targetId: credentialId,
    actorCredentialId: credentialId,
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
    public_key: r.public_key,
    counter: r.counter,
    transports: JSON.parse(r.transports),
  }));
  const opts = await makeAuthOptions(passkeys);
  const jar = await cookies();
  jar.set("pf_assert_challenge", Buffer.from(opts.challenge).toString("base64url"), {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/admin",
    maxAge: 300,
  });
  return opts;
}

export async function completeLogin(formData: FormData) {
  const env = await getEnv();
  const jar = await cookies();
  const ip = (formData.get("ip") as string) ?? "unknown";
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
    public_key: row.public_key,
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
  await writeAudit(env.DB, { action: "login_success", actorCredentialId: passkey.credential_id, ip });

  // Open redirect guard
  const next = formData.get("next") as string | null;
  const safeNext = next && /^\/admin(\/.*)?$/.test(next) ? next : "/admin";
  return { ok: true, redirect: safeNext };
}

async function issueSession(credentialId: string, env: AdminEnv) {
  const exp = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const nonce = randomUUID();
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