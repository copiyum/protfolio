import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { applySecurityHeaders, enforceAdminIpRate } from "@/lib/admin/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // L5 — per-IP rate limit on /admin/* (replaces WAF Rate Limiting Rules).
  // Runs at the edge before security headers so floods get a cheap 429.
  if (pathname.startsWith("/admin")) {
    const ctx = await getCloudflareContext({ async: true });
    const blocked = await enforceAdminIpRate(request, ctx.env as unknown as Parameters<typeof enforceAdminIpRate>[1]);
    if (blocked) return blocked;
  }

  // Generate one nonce per request, propagate via x-nonce request header so
  // Next.js applies it to its inline scripts, then reuse it on the response
  // CSP header so the browser trusts them.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  applySecurityHeaders(response, pathname, nonce);
  return response;
}

export const config = {
  matcher: [
    // Skip static, _next, favicon, public files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico)$).*)",
  ],
};