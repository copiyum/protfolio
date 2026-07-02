import { cookies, headers } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { verifyCfAccessJwt } from "../middleware";
import { verifySession, verifyStoredSession, type SessionPayload } from "../session";

export const ADMIN_COOKIE_NAME = "__Host-pf_admin";
export const ADMIN_SESSION_TTL_MS = 15 * 60 * 1000;
export const FRESH_ASSERTION_MS = 60 * 1000;

export interface ActionAdminEnv {
  DB: D1Database;
  ADMIN_COOKIE_SECRET: string;
  CF_ACCESS_AUD: string;
  CF_ACCESS_TEAM_DOMAIN: string;
  TURNSTILE_SECRET?: string;
  ALERT_EMAIL_WEBHOOK?: string;
}

export interface ActionRequestMeta {
  ip: string;
  ua?: string;
  host?: string;
}

export interface ActionAdmin {
  env: ActionAdminEnv;
  credentialId: string;
  session: SessionPayload;
  meta: ActionRequestMeta;
}

export async function getActionEnv(): Promise<ActionAdminEnv> {
  const ctx = await getCloudflareContext({ async: true });
  return ctx.env as unknown as ActionAdminEnv;
}

function metaFromHeaders(h: Headers): ActionRequestMeta {
  return {
    ip: h.get("cf-connecting-ip") ?? "unknown",
    ua: h.get("user-agent") ?? undefined,
    host: h.get("x-forwarded-host") ?? h.get("host") ?? undefined,
  };
}

async function assertCfAccess(h: Headers, env: ActionAdminEnv): Promise<void> {
  const jwt = h.get("cf-access-jwt-assertion");
  if (!jwt) throw new Error("CF Access required");
  const valid = await verifyCfAccessJwt(jwt, env.CF_ACCESS_AUD, env.CF_ACCESS_TEAM_DOMAIN);
  if (!valid) throw new Error("Invalid CF Access token");
}

function assertSameOrigin(h: Headers, meta: ActionRequestMeta): void {
  const origin = h.get("origin");
  if (!origin || !meta.host) throw new Error("Bad origin");
  if (new URL(origin).host !== meta.host) throw new Error("Bad origin");
}

export async function requireCfAccessForAction(options: { write?: boolean } = {}): Promise<{ env: ActionAdminEnv; meta: ActionRequestMeta }> {
  const env = await getActionEnv();
  const h = await headers();
  const meta = metaFromHeaders(h);
  await assertCfAccess(h, env);
  if (options.write) assertSameOrigin(h, meta);
  return { env, meta };
}

export async function requireActionAdmin(options: { write?: boolean; fresh?: boolean } = {}): Promise<ActionAdmin> {
  const env = await getActionEnv();
  const h = await headers();
  const meta = metaFromHeaders(h);
  await assertCfAccess(h, env);

  if (options.write) assertSameOrigin(h, meta);

  const jar = await cookies();
  const cookie = jar.get(ADMIN_COOKIE_NAME)?.value;
  if (!cookie) throw new Error("Login required");

  const session = await verifySession(cookie, env.ADMIN_COOKIE_SECRET);
  if (!session) throw new Error("Session expired");
  if (!(await verifyStoredSession(env.DB, session))) throw new Error("Session expired");

  if (options.fresh && (!session.freshAt || Date.now() - session.freshAt > FRESH_ASSERTION_MS)) {
    throw new Error("Fresh passkey assertion required");
  }

  return { env, credentialId: session.credentialId, session, meta };
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
