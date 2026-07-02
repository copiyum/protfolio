import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { env } from "cloudflare:workers";
import { writeAudit } from "@/lib/admin/audit";

describe("audit writer", () => {
  beforeAll(async () => {
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS audit_log (id TEXT PRIMARY KEY, actor_credential_id TEXT, action TEXT NOT NULL, target_table TEXT, target_id TEXT, ip TEXT, ua TEXT, ts TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), diff TEXT)`).run();
  });
  beforeEach(async () => { await env.DB.exec("DELETE FROM audit_log;"); });

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
    const row = await env.DB.prepare("SELECT * FROM audit_log WHERE id = ?").bind(id).first<{ action: string }>();
    expect(row?.action).toBe("create_post");
  });
});