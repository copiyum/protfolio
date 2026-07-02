import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { env } from "cloudflare:workers";
import { applySecurityHeaders, enforceAdminIpRate } from "@/lib/admin/middleware";

describe("security headers", () => {
  it("adds CSP, HSTS, frame deny, content-type nosniff, referrer, permissions", () => {
    const res = new Response("ok");
    const out = applySecurityHeaders(res, "/admin/posts");
    const h = out.headers;
    expect(h.get("Content-Security-Policy")).toMatch(/script-src 'self' 'nonce-/);
    expect(h.get("Strict-Transport-Security")).toMatch(/max-age=63072000/);
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

describe("admin IP rate limit (L5, replaces WAF)", () => {
  beforeAll(async () => {
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS rate_limits (scope_key TEXT PRIMARY KEY, window_start TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0)`,
    ).run();
  });
  beforeEach(async () => { await env.DB.exec("DELETE FROM rate_limits;"); });

  const e = { DB: env.DB } as Parameters<typeof enforceAdminIpRate>[1];

  function adminReq(ip: string) {
    return new Request(`https://sarang.dev/admin/posts`, { headers: { "cf-connecting-ip": ip } });
  }

  it("allows under limit", async () => {
    for (let i = 0; i < 10; i++) {
      expect(await enforceAdminIpRate(adminReq("1.1.1.1"), e)).toBeNull();
    }
  });

  it("blocks at limit with 429 + Retry-After", async () => {
    for (let i = 0; i < 10; i++) await enforceAdminIpRate(adminReq("2.2.2.2"), e);
    const blocked = await enforceAdminIpRate(adminReq("2.2.2.2"), e);
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
    expect(blocked!.headers.get("Retry-After")).toBe("10");
  });

  it("isolates per-IP buckets", async () => {
    for (let i = 0; i < 10; i++) await enforceAdminIpRate(adminReq("3.3.3.3"), e);
    expect(await enforceAdminIpRate(adminReq("3.3.3.3"), e)).not.toBeNull();
    expect(await enforceAdminIpRate(adminReq("4.4.4.4"), e)).toBeNull();
  });

  it("skips non-admin paths", async () => {
    const req = new Request(`https://sarang.dev/blog`, { headers: { "cf-connecting-ip": "5.5.5.5" } });
    for (let i = 0; i < 50; i++) {
      expect(await enforceAdminIpRate(req, e)).toBeNull();
    }
  });
});