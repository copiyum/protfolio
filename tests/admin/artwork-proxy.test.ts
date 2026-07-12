import { beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "cloudflare:workers";
import { applyD1Migrations } from "cloudflare:test";
import { handleArtworkProxyGet } from "@/lib/artwork-proxy";

function request(src: string) {
  return new Request(`https://sarang.dev/api/now-playing/art?src=${encodeURIComponent(src)}`, {
    headers: { "cf-connecting-ip": "1.2.3.4" },
  });
}

describe("artwork proxy", () => {
  beforeEach(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
    await env.DB.exec("DELETE FROM rate_limits;");
    vi.restoreAllMocks();
  });

  it("rejects unapproved hosts and redirect escapes", async () => {
    expect((await handleArtworkProxyGet(request("https://evil.example/art.png"), env)).status).toBe(400);
    const redirect = vi.fn(async () => new Response(null, {
      status: 302,
      headers: { location: "https://evil.example/art.png" },
    }));
    expect((await handleArtworkProxyGet(request("https://is1-ssl.mzstatic.com/art.png"), env, redirect)).status).toBe(502);
  });

  it("bounds bodies and serves only sniffed raster content", async () => {
    const oversized = vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), {
      headers: { "content-length": String(6 * 1024 * 1024), "content-type": "image/png" },
    }));
    expect((await handleArtworkProxyGet(request("https://is1-ssl.mzstatic.com/large.png"), env, oversized)).status).toBe(502);

    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const valid = vi.fn(async () => new Response(png.buffer, {
      headers: { "content-type": "text/html" },
    }));
    const response = await handleArtworkProxyGet(request("https://is1-ssl.mzstatic.com/art.png"), env, valid);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });
});
