import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { applySecurityHeaders, buildContentSecurityPolicy, enforceAdminIpRate } from "@/lib/admin/middleware";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_TTL_MS,
  PUBLIC_ADMIN_PATHS,
  SECOND_PASSKEY_PATH,
  SENSITIVE_ADMIN_PATH,
  createAuthGuard,
  type AdminAuthEnv,
  type EdgeGuardSuccess,
} from "@/lib/admin/auth-guard";

function isPlaywrightDevBypass() {
  return process.env.NODE_ENV === "development" && process.env.PLAYWRIGHT_TEST === "1";
}

function expireSessionCookie(res: NextResponse): void {
  res.cookies.set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

type AdminEdgeEnv = AdminAuthEnv;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdmin = pathname.startsWith("/admin");
  let adminEnv: AdminEdgeEnv | null = null;
  let renewal: EdgeGuardSuccess["renewal"];

  if (isAdmin) {
    const playwrightBypass = isPlaywrightDevBypass();
    const ctx = await getCloudflareContext({ async: true });
    const cloudflareEnv = ctx.env as unknown as AdminEdgeEnv;
    const env = playwrightBypass ? {
      ...cloudflareEnv,
      ADMIN_COOKIE_SECRET: process.env.ADMIN_COOKIE_SECRET ?? cloudflareEnv.ADMIN_COOKIE_SECRET,
      RATE_LIMIT_SECRET: process.env.RATE_LIMIT_SECRET ?? cloudflareEnv.RATE_LIMIT_SECRET,
      CF_ACCESS_AUD: process.env.CF_ACCESS_AUD ?? cloudflareEnv.CF_ACCESS_AUD,
      CF_ACCESS_TEAM_DOMAIN: process.env.CF_ACCESS_TEAM_DOMAIN ?? cloudflareEnv.CF_ACCESS_TEAM_DOMAIN,
    } : cloudflareEnv;
    const guard = createAuthGuard(env);
    adminEnv = env;

    // L5 — per-IP rate limit on /admin/login + /admin/setup only (not all /admin/*
    // because Next.js RSC fans out ~10 fetches per page load, which would self-DDoS).
    if (!playwrightBypass) {
      const blocked = await enforceAdminIpRate(request, env);
      if (blocked) return blocked;
    }

    const cfAccess = await guard.edgeMiddleware(request, { skipCfAccess: playwrightBypass });
    if (cfAccess instanceof Response) return cfAccess;

    // L2 — passkey session. Skip on /admin/login and /admin/setup (the entry
    // points); everything else requires a valid __Host-pf_admin cookie.
    if (!PUBLIC_ADMIN_PATHS.test(pathname)) {
      const auth = await guard.edgeMiddleware(request, {
        requireSession: true,
        fresh: request.method !== "GET" && SENSITIVE_ADMIN_PATH.test(pathname),
        skipCfAccess: true,
      });
      if (auth instanceof Response) {
        const message = await auth.text();
        if (message === "Login required" || message === "Session expired") {
          const res = NextResponse.redirect(new URL("/admin/login", request.url));
          if (message === "Session expired") expireSessionCookie(res);
          return res;
        }
        return new NextResponse(message, { status: auth.status });
      }
      renewal = auth.renewal;
      if (!auth.credentialId) {
        return NextResponse.redirect(new URL("/admin/login", request.url));
      }
      const passkeyCount = await env.DB.prepare("SELECT COUNT(*) AS c FROM passkeys").first<{ c: number }>();
      if ((passkeyCount?.c ?? 0) < 2 && !SECOND_PASSKEY_PATH.test(pathname)) {
        return NextResponse.redirect(new URL("/admin/passkeys/register?required=1", request.url));
      }
    }
  }

  // Public routes: static CSP with no per-request nonce, so pages stay
  // statically renderable / ISR-cacheable (see buildContentSecurityPolicy).
  if (!isAdmin) {
    const response = NextResponse.next();
    applySecurityHeaders(response, pathname);
    return response;
  }

  // Admin: one nonce per request, forwarded on the request CSP header so Next.js
  // stamps it on its inline scripts, and reused on the response CSP header.
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", buildContentSecurityPolicy(pathname, nonce));

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  applySecurityHeaders(response, pathname, nonce);
  if (renewal && adminEnv) {
    response.cookies.set(ADMIN_COOKIE_NAME, renewal.cookie, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: ADMIN_SESSION_TTL_MS / 1000,
    });
  }

  return response;
}

export const config = {
  matcher: [
    // Skip static, _next, favicon, public files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico)$).*)",
  ],
};
