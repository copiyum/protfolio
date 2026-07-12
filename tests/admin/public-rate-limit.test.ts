import { beforeEach, describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import { applyD1Migrations } from "cloudflare:test";
import { enforcePublicRateLimit } from "@/lib/public-rate-limit";

describe("public rate limiting", () => {
  beforeEach(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
    await env.DB.exec("DELETE FROM rate_limits;");
  });

  it("fails closed when storage or secret configuration is unavailable", async () => {
    const request = new Request("https://sarang.dev/api/test", { headers: { "cf-connecting-ip": "1.2.3.4" } });
    await expect(enforcePublicRateLimit(request, {}, "test", 1, 60)).resolves.toMatchObject({ status: 503 });
    await expect(enforcePublicRateLimit(request, { DB: env.DB }, "test", 1, 60)).resolves.toMatchObject({ status: 503 });
  });

  it("ignores spoofable forwarding headers", async () => {
    const request = new Request("https://sarang.dev/api/test", { headers: { "x-forwarded-for": "1.2.3.4" } });
    const config = { DB: env.DB, RATE_LIMIT_SECRET: env.RATE_LIMIT_SECRET };
    await expect(enforcePublicRateLimit(request, config, "test", 1, 60)).resolves.toBeNull();
    await expect(enforcePublicRateLimit(request, config, "test", 1, 60)).resolves.toMatchObject({ status: 429 });
  });
});
