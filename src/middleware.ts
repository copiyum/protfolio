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
  const response = NextResponse.next();
  applySecurityHeaders(response, pathname);
  return response;
}

export const config = {
  matcher: [
    // Skip static, _next, favicon, public files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico)$).*)",
  ],
};