import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { applySecurityHeaders, enforceAdminIpRate, verifyCfAccessJwt } from "@/lib/admin/middleware";
import { verifySession } from "@/lib/admin/session";

const SESSION_COOKIE = "__Host-pf_admin";
const PUBLIC_ADMIN_PATHS = /^\/admin\/(login|setup)\/?$/;

// Cloudflare auto-injects the Web Analytics beacon into every page on the zone
// via the edge (before our Worker runs). The bundled `integrity` SRI hash no
// longer matches the rolled JS bytes, so the browser logs an error on every
// page load and refuses to load it. Strip the tag — we don't want analytics on
// /admin/* anyway, and on the public site the beacon was dead in the water.
// Also strip the matching `<noscript>` 1x1 pixel fallback for the same reason.
const CF_BEACON_SCRIPT_RE =
  /<script\b[^>]*?\bsrc=["']https:\/\/static\.cloudflareinsights\.com\/[^"']*["'][^>]*?>\s*<\/script>/gi;
const CF_BEACON_PIXEL_RE =
  /<noscript>[^<]*<img\b[^>]*?\bsrc=["']https:\/\/static\.cloudflareinsights\.com\/[^"']*["'][^>]*?>(?:\s*<\/img>)?\s*<\/noscript>/gi;

async function stripCfBeacon(response: Response): Promise<Response> {
  const ct = response.headers.get("content-type") ?? "";
  if (!ct.includes("text/html")) return response;
  let html: string;
  try {
    html = await response.text();
  } catch {
    return response;
  }
  const stripped = html.replace(CF_BEACON_SCRIPT_RE, "").replace(CF_BEACON_PIXEL_RE, "");
  if (stripped === html) return response;
  const headers = new Headers(response.headers);
  headers.set("content-length", String(new TextEncoder().encode(stripped).byteLength));
  return new Response(stripped, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

interface AdminEdgeEnv {
  DB: D1Database;
  ADMIN_COOKIE_SECRET: string;
  CF_ACCESS_AUD: string;
  CF_ACCESS_TEAM_DOMAIN: string;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    const ctx = await getCloudflareContext({ async: true });
    const env = ctx.env as unknown as AdminEdgeEnv;

    // L5 — per-IP rate limit on /admin/login + /admin/setup only (not all /admin/*
    // because Next.js RSC fans out ~10 fetches per page load, which would self-DDoS).
    const blocked = await enforceAdminIpRate(request, env);
    if (blocked) return blocked;

    // L1 — CF Access JWT. Edge already gates this, but verify app-side so a
    // misconfigured route never serves the admin shell to unauth'd callers.
    const cfJwt = request.headers.get("cf-access-jwt-assertion");
    const cfOk = cfJwt ? await verifyCfAccessJwt(cfJwt, env.CF_ACCESS_AUD, env.CF_ACCESS_TEAM_DOMAIN) : false;
    if (!cfOk) {
      return new NextResponse("CF Access required", { status: 401 });
    }

    // L2 — passkey session. Skip on /admin/login and /admin/setup (the entry
    // points); everything else requires a valid __Host-pf_admin cookie.
    if (!PUBLIC_ADMIN_PATHS.test(pathname)) {
      const cookie = request.cookies.get(SESSION_COOKIE)?.value;
      if (!cookie) {
        return NextResponse.redirect(new URL("/admin/login", request.url));
      }
      const session = await verifySession(cookie, env.ADMIN_COOKIE_SECRET);
      if (!session) {
        const res = NextResponse.redirect(new URL("/admin/login", request.url));
        res.cookies.delete(SESSION_COOKIE);
        return res;
      }
    }
  }

  // Generate one nonce per request, propagate via x-nonce request header so
  // Next.js applies it to its inline scripts, then reuse it on the response
  // CSP header so the browser trusts them.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  applySecurityHeaders(response, pathname, nonce);

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