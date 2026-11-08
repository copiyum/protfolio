import { consume } from "./ratelimit";
import {
  SENSITIVE_ADMIN_PATH,
  createAuthGuard,
  verifyCfAccessJwt,
  type AdminAuthEnv,
} from "./auth-guard";

export { verifyCfAccessJwt };

// security headers — applied to every response via Next.js middleware.ts.
//
// Admin pages use a per-request nonce CSP; middleware also places that CSP on
// the forwarded request so Next.js adds matching nonces to its inline scripts.
// That forces every render to be dynamic, which is fine for /admin.
//
// Public pages are statically rendered / ISR-cached, so one HTML document is
// served to many visitors and cannot carry a per-request nonce. Next's inline
// RSC/bootstrap scripts differ per page and per revalidation, so hashes aren't
// practical either: public script-src allows 'unsafe-inline'. Deliberate
// tradeoff — external scripts are still limited to 'self' + Turnstile, and the
// public site renders no user-supplied HTML (visitor notes are text/images).
export function buildContentSecurityPolicy(pathname: string, nonce?: string): string {
  const isAdmin = pathname.startsWith("/admin");
  const isDev = process.env.NODE_ENV === "development";
  const scriptSrc = (
    isDev
      ? ["'self'", "'unsafe-eval'", "'unsafe-inline'", "https://challenges.cloudflare.com"]
      : isAdmin
        ? ["'self'", `'nonce-${nonce ?? crypto.randomUUID().replace(/-/g, "")}'`, "https://challenges.cloudflare.com"]
        : ["'self'", "'unsafe-inline'", "https://challenges.cloudflare.com"]
  ).join(" ");
  return [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    // Tailwind v4 inlines styles; revisit when migrating to CSS modules
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https:`,
    // Turnstile needs connect; map tiles (public) need openfreemap.
    isAdmin
      ? `connect-src 'self' https://challenges.cloudflare.com`
      : `connect-src 'self' https://challenges.cloudflare.com https://tiles.openfreemap.org https://api.openfreemap.org`,
    // MapLibre runs its parser/renderer in a blob worker on public pages.
    isAdmin ? `worker-src 'none'` : `worker-src 'self' blob:`,
    // Turnstile widget renders inside a cf-hosted iframe (admin + public visitors page).
    `frame-src https://challenges.cloudflare.com`,
    `frame-ancestors ${isAdmin ? "'none'" : "'self'"}`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join("; ");
}

export function applySecurityHeaders(res: Response, pathname: string, nonce?: string): Response {
  const isAdmin = pathname.startsWith("/admin");
  const effectiveNonce = isAdmin ? nonce ?? crypto.randomUUID().replace(/-/g, "") : undefined;
  const csp = buildContentSecurityPolicy(pathname, effectiveNonce);
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.headers.set("X-Frame-Options", isAdmin ? "DENY" : "SAMEORIGIN");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");
  if (effectiveNonce) res.headers.set("x-nonce", effectiveNonce);
  return res;
}

export type AdminEnv = AdminAuthEnv;

// L5 — per-IP rate limit at the edge (replaces CF WAF Rate Limiting Rules,
// which require a paid plan). Spec: only /admin/login + /admin/setup — NOT
// /admin/* in general, because Next.js App Router issues many parallel RSC
// fetches per page render (~10/load) which would self-DDoS the admin.
const RL_PATHS = [/^\/admin\/login\/?$/, /^\/admin\/setup\/?$/];
const ADMIN_RL_LIMIT = 100;
const ADMIN_RL_WINDOW_SEC = 3600;

export async function enforceAdminIpRate(req: Request, env: AdminEnv): Promise<Response | null> {
  const url = new URL(req.url);
  if (!RL_PATHS.some((re) => re.test(url.pathname))) return null;
  const ip = req.headers.get("cf-connecting-ip") ?? "unknown";
  const allowed = await consume(env.DB, `ip:${ip}:${url.pathname}`, ADMIN_RL_LIMIT, ADMIN_RL_WINDOW_SEC);
  if (allowed) return null;
  return new Response("Too Many Requests", {
    status: 429,
    headers: { "Retry-After": String(ADMIN_RL_WINDOW_SEC) },
  });
}

export async function requireAdmin(req: Request, env: AdminEnv): Promise<{ credentialId: string } | Response> {
  const result = await createAuthGuard(env).edgeMiddleware(req, {
    requireSession: true,
    fresh: req.method !== "GET" && SENSITIVE_ADMIN_PATH.test(new URL(req.url).pathname),
  });
  if (result instanceof Response) return result;
  return { credentialId: result.credentialId ?? "" };
}
