import { cookies, headers } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_TTL_MS,
  FRESH_ASSERTION_MS,
  createAuthGuard,
  type AdminAuthEnv,
  type AdminContext,
  type AuthMeta,
} from "../auth-guard";

export { ADMIN_COOKIE_NAME, ADMIN_SESSION_TTL_MS, FRESH_ASSERTION_MS };
export type ActionAdminEnv = AdminAuthEnv;
export type ActionRequestMeta = AuthMeta;
export type ActionAdmin = AdminContext;

export async function getActionEnv(): Promise<ActionAdminEnv> {
  const ctx = await getCloudflareContext({ async: true });
  return ctx.env as unknown as ActionAdminEnv;
}

export async function requireCfAccessForAction(options: { write?: boolean } = {}): Promise<{ env: ActionAdminEnv; meta: ActionRequestMeta }> {
  const env = await getActionEnv();
  const h = await headers();
  return createAuthGuard(env).cfAccessGuard(h, options);
}

export async function requireActionAdmin(options: { write?: boolean; fresh?: boolean } = {}): Promise<ActionAdmin> {
  const env = await getActionEnv();
  const h = await headers();
  const jar = await cookies();
  return createAuthGuard(env).serverActionGuard({
    headers: h,
    cookie: jar.get(ADMIN_COOKIE_NAME)?.value,
    ...options,
  });
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
