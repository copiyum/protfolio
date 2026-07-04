import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { env } from "cloudflare:workers";
import { consume, reset } from "@/lib/admin/ratelimit";

describe("rate limit", () => {
  beforeAll(async () => {
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS rate_limits (scope_key TEXT PRIMARY KEY, window_start TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0)`).run();
  });
  beforeEach(async () => { await env.DB.exec("DELETE FROM rate_limits;"); });

  it("allows up to limit", async () => {
    const key = "ip:1.2.3.4:/admin/login";
    for (let i = 0; i < 5; i++) {
      expect(await consume(env.DB, key, 5, 3600)).toBe(true);
    }
    expect(await consume(env.DB, key, 5, 3600)).toBe(false);
  });

  it("resets after window", async () => {
    const key = "k";
    // First consume: limit=1, windowSec=0 (always-expired window) → succeeds, INSERT row with count=1
    await consume(env.DB, key, 1, 0);
    // Second consume: windowSec=0 again forces reset path regardless of count → succeeds
    expect(await consume(env.DB, key, 1, 0)).toBe(true);
  });

  it("reset clears a key", async () => {
    const key = "reset-k";
    await consume(env.DB, key, 1, 3600);
    expect(await consume(env.DB, key, 1, 3600)).toBe(false);
    await reset(env.DB, key);
    expect(await consume(env.DB, key, 1, 3600)).toBe(true);
  });

  it("does not oversubscribe concurrent requests", async () => {
    const key = "race-k";
    const results = await Promise.all([
      consume(env.DB, key, 1, 3600),
      consume(env.DB, key, 1, 3600),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });
});
