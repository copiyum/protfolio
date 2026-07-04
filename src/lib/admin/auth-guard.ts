import { createRemoteJWKSet, jwtVerify } from "jose";
import { prepareAudit, writeAudit as writeAuditRow, type AuditInput } from "./audit";
import {
  renewStoredSession,
  signSession,
  verifySession,
  verifyStoredSession,
  type SessionPayload,
} from "./session";

export const ADMIN_COOKIE_NAME = "__Host-pf_admin";
export const ADMIN_SESSION_TTL_MS = 15 * 60 * 1000;
export const ADMIN_SESSION_RENEW_THRESHOLD_MS = 5 * 60 * 1000;
export const FRESH_ASSERTION_MS = 60 * 1000;

export const PUBLIC_ADMIN_PATHS = /^\/admin\/(login|setup)\/?$/;
export const SECOND_PASSKEY_PATH = /^\/admin\/passkeys\/register\/?$/;
export const SENSITIVE_ADMIN_PATH =
  /\/admin\/(posts|projects|experiences|social-links|tech-stack|bento|nav|seo|feature-flags)\/.*\/(delete|rotate)|\/admin\/passkeys\/.*\/delete/;

export interface AdminAuthEnv {
  DB: D1Database;
  ADMIN_COOKIE_SECRET: string;
  CF_ACCESS_AUD: string;
  CF_ACCESS_TEAM_DOMAIN: string;
  TURNSTILE_SECRET?: string;
  ALERT_EMAIL_WEBHOOK?: string;
}

export interface AuthMeta {
  ip: string;
  ua?: string;
  host?: string;
}

export interface AdminContext {
  env: AdminAuthEnv;
  db: D1Database;
  credentialId: string;
  session: SessionPayload;
  meta: AuthMeta;
  auditMeta: {
    actorCredentialId: string;
    ip: string;
    ua?: string;
  };
  prepareAudit(input: Omit<AuditInput, "actorCredentialId" | "ip" | "ua">): ReturnType<typeof prepareAudit>;
  writeAudit(input: Omit<AuditInput, "actorCredentialId" | "ip" | "ua">): Promise<string>;
}

export interface CfAccessContext {
  env: AdminAuthEnv;
  db: D1Database;
  meta: AuthMeta;
}

export interface EdgeGuardSuccess {
  credentialId?: string;
  session?: SessionPayload;
  renewal?: { session: SessionPayload; expiresAt: string; cookie: string };
}

export interface EdgeGuardOptions {
  requireSession?: boolean;
  fresh?: boolean;
  skipCfAccess?: boolean;
}

export interface RequestGuardOptions {
  write?: boolean;
  fresh?: boolean;
}

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export async function verifyCfAccessJwt(jwt: string, aud: string, teamDomain: string): Promise<boolean> {
  let jwks = jwksCache.get(teamDomain);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`https://${teamDomain}/cdn-cgi/access/certs`));
    jwksCache.set(teamDomain, jwks);
  }
  try {
    const { payload } = await jwtVerify(jwt, jwks, { audience: aud, issuer: `https://${teamDomain}` });
    return !!payload;
  } catch {
    return false;
  }
}

export function metaFromHeaders(headers: Headers): AuthMeta {
  return {
    ip: headers.get("cf-connecting-ip") ?? "unknown",
    ua: headers.get("user-agent") ?? undefined,
    host: headers.get("x-forwarded-host") ?? headers.get("host") ?? undefined,
  };
}

function sameOrigin(origin: string | null, requestUrlOrHost: string | undefined): boolean {
  if (!origin || !requestUrlOrHost) return false;
  try {
    const expectedHost = requestUrlOrHost.includes("://")
      ? new URL(requestUrlOrHost).host
      : requestUrlOrHost;
    return new URL(origin).host === expectedHost;
  } catch {
    return false;
  }
}

function cookieValueFromHeader(cookieHeader: string | null, name: string): string | null {
  const encoded = cookieHeader?.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))?.[1];
  return encoded ? decodeURIComponent(encoded) : null;
}

function makeAdminContext(env: AdminAuthEnv, session: SessionPayload, meta: AuthMeta): AdminContext {
  const auditMeta = {
    actorCredentialId: session.credentialId,
    ip: meta.ip,
    ua: meta.ua,
  };
  return {
    env,
    db: env.DB,
    credentialId: session.credentialId,
    session,
    meta,
    auditMeta,
    prepareAudit(input) {
      return prepareAudit(env.DB, { ...input, ...auditMeta });
    },
    writeAudit(input) {
      return writeAuditRow(env.DB, { ...input, ...auditMeta });
    },
  };
}

export function createAuthGuard(env: AdminAuthEnv) {
  async function assertCfAccess(headers: Headers, skipCfAccess = false): Promise<void> {
    if (skipCfAccess) return;
    const jwt = headers.get("cf-access-jwt-assertion");
    if (!jwt) throw new Error("CF Access required");
    const valid = await verifyCfAccessJwt(jwt, env.CF_ACCESS_AUD, env.CF_ACCESS_TEAM_DOMAIN);
    if (!valid) throw new Error("Invalid CF Access token");
  }

  function assertWriteOrigin(headers: Headers, meta: AuthMeta, requestUrl?: string): void {
    if (!sameOrigin(headers.get("origin"), requestUrl ?? meta.host)) {
      throw new Error("Bad origin");
    }
  }

  async function verifyCookieSession(cookie: string | null): Promise<SessionPayload> {
    if (!cookie) throw new Error("Login required");
    const session = await verifySession(cookie, env.ADMIN_COOKIE_SECRET);
    if (!session) throw new Error("Session expired");
    if (!(await verifyStoredSession(env.DB, session))) throw new Error("Session expired");
    return session;
  }

  function assertFresh(session: SessionPayload): void {
    if (!session.freshAt || Date.now() - session.freshAt > FRESH_ASSERTION_MS) {
      throw new Error("Fresh passkey assertion required");
    }
  }

  async function cfAccessGuard(headers: Headers, options: RequestGuardOptions & { requestUrl?: string; skipCfAccess?: boolean } = {}): Promise<CfAccessContext> {
    const meta = metaFromHeaders(headers);
    await assertCfAccess(headers, options.skipCfAccess);
    if (options.write) assertWriteOrigin(headers, meta, options.requestUrl);
    return { env, db: env.DB, meta };
  }

  async function serverActionGuard({
    headers,
    cookie,
    requestUrl,
    write,
    fresh,
    skipCfAccess,
  }: RequestGuardOptions & {
    headers: Headers;
    cookie: string | null | undefined;
    requestUrl?: string;
    skipCfAccess?: boolean;
  }): Promise<AdminContext> {
    const meta = metaFromHeaders(headers);
    await assertCfAccess(headers, skipCfAccess);
    if (write) assertWriteOrigin(headers, meta, requestUrl);
    const session = await verifyCookieSession(cookie ?? null);
    if (fresh) assertFresh(session);
    return makeAdminContext(env, session, meta);
  }

  async function rscGuard({
    headers,
    cookie,
    redirect,
    requestUrl,
    skipCfAccess,
  }: {
    headers: Headers;
    cookie: string | null | undefined;
    redirect: (path: string) => never;
    requestUrl?: string;
    skipCfAccess?: boolean;
  }): Promise<{ db: D1Database; credentialId: string; context: AdminContext }> {
    try {
      const context = await serverActionGuard({ headers, cookie, requestUrl, skipCfAccess });
      return { db: env.DB, credentialId: context.credentialId, context };
    } catch {
      return redirect("/admin/login");
    }
  }

  async function edgeMiddleware(request: Request, options: EdgeGuardOptions = {}): Promise<Response | EdgeGuardSuccess> {
    const headers = request.headers;
    try {
      await assertCfAccess(headers, options.skipCfAccess);
      if (!options.requireSession) return {};
      const session = await verifyCookieSession(cookieValueFromHeader(headers.get("cookie"), ADMIN_COOKIE_NAME));
      if (options.fresh) assertFresh(session);
      let renewal: EdgeGuardSuccess["renewal"];
      const expiresAtMs = new Date(session.expiresAt).getTime();
      if (session.sessionId && expiresAtMs - Date.now() < ADMIN_SESSION_RENEW_THRESHOLD_MS) {
        const expiresAt = new Date(Date.now() + ADMIN_SESSION_TTL_MS).toISOString();
        await renewStoredSession(env.DB, session.sessionId, expiresAt);
        const cookie = await signSession({ ...session, expiresAt }, env.ADMIN_COOKIE_SECRET);
        renewal = { session, expiresAt, cookie };
      }
      return { credentialId: session.credentialId, session, renewal };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unauthorized";
      const status = message === "Bad origin" ? 403 : 401;
      return new Response(message, { status });
    }
  }

  async function issueSession(credentialId: string, meta: AuthMeta): Promise<{ cookie: string; expiresAt: string; sessionId: string }> {
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + ADMIN_SESSION_TTL_MS).toISOString();
    const nonce = crypto.randomUUID();
    await env.DB.prepare(
      "INSERT INTO sessions (id, passkey_credential_id, expires_at, ip, ua) VALUES (?, ?, ?, ?, ?)",
    ).bind(sessionId, credentialId, expiresAt, meta.ip, meta.ua ?? null).run();
    const cookie = await signSession({ sessionId, credentialId, expiresAt, nonce, freshAt: Date.now() }, env.ADMIN_COOKIE_SECRET);
    return { cookie, expiresAt, sessionId };
  }

  return {
    cfAccessGuard,
    edgeMiddleware,
    serverActionGuard,
    rscGuard,
    issueSession,
  };
}
