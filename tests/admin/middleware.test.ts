import { describe, it, expect } from "vitest";
import { applySecurityHeaders } from "@/lib/admin/middleware";

describe("security headers", () => {
  it("adds CSP, HSTS, frame deny, content-type nosniff, referrer, permissions", () => {
    const res = new Response("ok");
    const out = applySecurityHeaders(res, "/admin/posts");
    const h = out.headers;
    expect(h.get("Content-Security-Policy")).toMatch(/script-src 'self' 'nonce-/);
    expect(h.get("Strict-Transport-Security")).toMatch(/max-age=63072000/);
    expect(h.get("X-Frame-Options")).toBe("DENY");
    expect(h.get("X-Content-Type-Options")).toBe("nosniff");
    expect(h.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(h.get("Permissions-Policy")).toMatch(/camera=\(\)/);
  });

  it("frame-ancestors none on /admin", () => {
    const out = applySecurityHeaders(new Response("ok"), "/admin/x");
    expect(out.headers.get("Content-Security-Policy")).toMatch(/frame-ancestors 'none'/);
  });

  it("frame-ancestors self on public", () => {
    const out = applySecurityHeaders(new Response("ok"), "/blog");
    expect(out.headers.get("Content-Security-Policy")).toMatch(/frame-ancestors 'self'/);
    expect(out.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
  });
});