import { createRemoteJWKSet, jwtVerify } from "jose";

// security headers — applied to every response via Next.js middleware.ts
// When called from middleware, the same nonce must be propagated on the
// incoming request via x-nonce header so Next.js applies it to its inline
// scripts. Otherwise the browser refuses to execute Next.js's bootstrap.
export function applySecurityHeaders(res: Response, pathname: string, nonce?: string): Response {
  const effectiveNonce = nonce ?? crypto.randomUUID().replace(/-/g, "");
  const isAdmin = pathname.startsWith("/admin");
  const csp = [
    `default-src 'self'`,
    // 'strict-dynamic' lets scripts loaded by the trusted nonce-tagged
    // bootstrap script run without their own nonce (Next.js dynamic imports).
    isAdmin
      ? `script-src 'self' 'nonce-${effectiveNonce}' 'strict-dynamic' https://challenges.cloudflare.com`
      : `script-src 'self' 'nonce-${effectiveNonce}' 'strict-dynamic'`,
    // Tailwind v4 inlines styles; revisit when migrating to CSS modules
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    isAdmin
      ? `connect-src 'self' https://challenges.cloudflare.com`
      : `connect-src 'self'`,
    // Turnstile invisible widget renders inside a cf-hosted iframe.
    isAdmin ? `frame-src https://challenges.cloudflare.com` : `frame-src 'none'`,
    `frame-ancestors ${isAdmin ? "'none'" : "'self'"}`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join("; ");
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.headers.set("X-Frame-Options", isAdmin ? "DENY" : "SAMEORIGIN");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");
  res.headers.set("x-nonce", effectiveNonce);
  return res;
}

// CF Access JWT — JWKS cached per team domain.
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

const SENSITIVE = /\/admin\/(posts|projects|experiences|social-links|tech-stack|bento|nav|seo|feature-flags)\/.*\/(delete|rotate)|\/admin\/passkeys\/.*\/delete/;

export interface AdminEnv {
  DB: D1Database;
  ADMIN_COOKIE_SECRET: string;
  CF_ACCESS_AUD: string;
  CF_ACCESS_TEAM_DOMAIN: string;
}

// L5 — per-IP rate limit at the edge (replaces CF WAF Rate Limiting Rules,
// which require a paid plan). Applies to all /admin/* paths before any other
// work — floods are blocked before CF Access JWT verification, D1 reads, or
// cookie parsing. Spec target: 10 req / 10 s per IP.
const ADMIN_RL_LIMIT = 10;
const ADMIN_RL_WINDOW_SEC = 10;

export async function enforceAdminIpRate(req: Request, env: AdminEnv): Promise<Response | null> {
  const url = new URL(req.url);
  if (!url.pathname.startsWith("/admin")) return null;
  const ip = req.headers.get("cf-connecting-ip") ?? "unknown";
  const { consume } = await import("./ratelimit");
  const allowed = await consume(env.DB, `ip:${ip}:/admin/*`, ADMIN_RL_LIMIT, ADMIN_RL_WINDOW_SEC);
  if (allowed) return null;
  return new Response("Too Many Requests", {
    status: 429,
    headers: { "Retry-After": String(ADMIN_RL_WINDOW_SEC) },
  });
}

export async function requireAdmin(req: Request, env: AdminEnv): Promise<{ credentialId: string } | Response> {
  // L1 — CF Access JWT
  const jwt = req.headers.get("cf-access-jwt-assertion");
  if (!jwt) return new Response("CF Access required", { status: 401 });
  const valid = await verifyCfAccessJwt(jwt, env.CF_ACCESS_AUD, env.CF_ACCESS_TEAM_DOMAIN);
  if (!valid) return new Response("Invalid CF Access token", { status: 401 });

  // L3 — passkey session cookie
  const cookie = req.headers.get("cookie")?.match(/__Host-pf_admin=([^;]+)/)?.[1];
  if (!cookie) return new Response("Login required", { status: 401 });
  const { verifySession } = await import("./session");
  const session = await verifySession(decodeURIComponent(cookie), env.ADMIN_COOKIE_SECRET);
  if (!session) return new Response("Session expired", { status: 401 });

  // L4 — origin allowlist on writes
  if (req.method !== "GET") {
    const origin = req.headers.get("origin");
    if (origin && new URL(origin).host !== new URL(req.url).host) {
      return new Response("Bad origin", { status: 403 });
    }
  }

  // L3 — sensitive op re-prompt (<60s fresh assertion)
  if (req.method !== "GET" && SENSITIVE.test(new URL(req.url).pathname)) {
    const lastFresh = req.headers.get("x-passkey-fresh-at");
    if (!lastFresh || Date.now() - parseInt(lastFresh) > 60_000) {
      return new Response("Fresh passkey assertion required", { status: 401 });
    }
  }

  return { credentialId: session.credentialId };
}