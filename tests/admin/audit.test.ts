import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:workers";
import { applyD1Migrations } from "cloudflare:test";
import { writeAudit } from "@/lib/admin/audit";

describe("audit writer", () => {
  beforeEach(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
    await env.DB.exec("DELETE FROM audit_log;");
  });

  it("inserts a row", async () => {
    const id = await writeAudit(env.DB, {
      action: "create_post",
      targetTable: "posts",
      targetId: "p1",
      actorCredentialId: "cred-abc",
      ip: "1.2.3.4",
      ua: "Mozilla",
      diff: { title: "Hello" },
    });
    expect(id).toBeTruthy();
    const row = await env.DB.prepare("SELECT action FROM audit_log WHERE id = ?").bind(id).first<{ action: string }>();
    expect(row?.action).toBe("create_post");
  });
});
