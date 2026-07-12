import { beforeEach, describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import { applyD1Migrations } from "cloudflare:test";
import { runAuditMaintenance } from "@/lib/admin/audit-maintenance";

async function clearAuditObjects() {
  const objects = await env.R2.list({ prefix: "audit/" });
  await Promise.all(objects.objects.map((object) => env.R2.delete(object.key)));
}

describe("audit maintenance", () => {
  beforeEach(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
    await clearAuditObjects();
  });

  it("writes a unique restorable archive and applies retention", async () => {
    const now = new Date("2026-07-12T03:00:00.000Z");
    await env.DB.prepare(
      "INSERT INTO audit_log (id, action, ts) VALUES ('recent', 'login', ?), ('old', 'old-event', ?)",
    ).bind(now.toISOString(), "2025-01-01T00:00:00.000Z").run();
    await env.DB.prepare(
      "INSERT INTO rate_limits (scope_key, window_start, count) VALUES ('old-rate', ?, 1)",
    ).bind(Math.floor(now.getTime() / 1000) - 3 * 24 * 60 * 60).run();

    const result = await runAuditMaintenance(env, now);
    expect(result.archiveKey).toMatch(/^audit\/2026-07-12\/.*-[a-f0-9]{16}\.jsonl\.gz$/);
    expect(result.archivedRows).toBe(1);
    expect(result.expiredAuditRows).toBe(1);
    expect(result.expiredRateLimits).toBe(1);

    const archive = await env.R2.get(result.archiveKey);
    expect(archive?.customMetadata?.sha256).toMatch(/^[a-f0-9]{64}$/);
    const restored = await new Response(
      archive!.body.pipeThrough(new DecompressionStream("gzip")),
    ).text();
    expect(JSON.parse(restored)).toMatchObject({ id: "recent", action: "login" });
    await expect(env.DB.prepare("SELECT id FROM audit_log WHERE id = 'old'").first()).resolves.toBeNull();
  });
});
