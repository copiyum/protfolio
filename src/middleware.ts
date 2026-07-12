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

// Cloudflare auto-injects the Web Analytics beacon into every page on the zone
// via the edge (before our Worker runs). The bundled `integrity` SRI hash no
// longer matches the rolled JS bytes, so the browser logs an error on every
// page load and refuses to load it. Strip the tag — we don't want analytics on
// /admin/* anyway, and on the public site the beacon was dead in the water.
async function stripCfBeacon(response: Response): Promise<Response> {
  const ct = response.headers.get("content-type") ?? "";
  if (!ct.includes("text/html")) return response;
  const rewriter = new HTMLRewriter()
    .on("script[src*='cloudflareinsights.com']", {
      element(el) { el.remove(); },
    });
  return rewriter.transform(response);
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

  // Generate one nonce per request, propagate via x-nonce request header so
  // Next.js applies it to its inline scripts, then reuse it on the response
  // CSP header so the browser trusts them.
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

  // Strip Cloudflare Web Analytics beacon from HTML responses (zone-injected,
  // not via our Worker, so we have to undo it after the page renders).
  return stripCfBeacon(response);
}

export const config = {
  matcher: [
    // Skip static, _next, favicon, public files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico)$).*)",
  ],
};
