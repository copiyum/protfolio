import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:workers";
import { applyD1Migrations } from "cloudflare:test";
import { defineCrud } from "@/lib/admin/actions/_crud-helper";
import { prepareAudit, writeAudit } from "@/lib/admin/audit";
import { PostInput } from "@/lib/admin/schema/posts";
import type { ActionAdmin } from "@/lib/admin/actions/_security";

const columns = ["id", "title", "slug", "date", "summary", "tags", "cover", "content", "published"] as const;

function makeCrud(authCalls: unknown[], updatedTags: string[]) {
  const auditMeta = { actorCredentialId: "cred-1", ip: "1.2.3.4", ua: "vitest" };
  const admin: ActionAdmin = {
    env: {
      DB: env.DB,
      ADMIN_COOKIE_SECRET: "secret",
      CF_ACCESS_AUD: "aud",
      CF_ACCESS_TEAM_DOMAIN: "team.example.com",
    },
    db: env.DB,
    credentialId: "cred-1",
    session: {
      sessionId: "session-1",
      credentialId: "cred-1",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      nonce: "nonce",
      freshAt: Date.now(),
    },
    meta: { ip: "1.2.3.4", ua: "vitest" },
    auditMeta,
    prepareAudit: (input) => prepareAudit(env.DB, { ...input, ...auditMeta }),
    writeAudit: (input) => writeAudit(env.DB, { ...input, ...auditMeta }),
  };

  return defineCrud({
    table: "posts",
    tag: "posts",
    columns,
    jsonColumns: ["tags", "content"],
    booleanColumns: ["published"],
    orderBy: "date DESC",
    schema: {
      parse: (input) => PostInput.parse(input),
      partial: () => ({ parse: (input) => PostInput.partial().parse(input) }),
    },
  }, {
    requireActionAdmin: async (options) => {
      authCalls.push(options);
      return admin;
    },
    updateTag: (tag) => {
      updatedTags.push(tag);
    },
  });
}

describe("CRUD server action helper", () => {
  beforeEach(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
    await env.DB.exec("DELETE FROM audit_log; DELETE FROM posts;");
  });

  it("creates posts with JSON/boolean coercion, audit, and tag invalidation", async () => {
    const authCalls: unknown[] = [];
    const updatedTags: string[] = [];
    const crud = makeCrud(authCalls, updatedTags);

    await expect(crud.create({
      id: "p1",
      title: "Hello",
      slug: "hello",
      date: "2026-01-01",
      summary: "Summary",
      tags: ["admin", "test"],
      content: ["Body"],
      published: true,
    })).resolves.toEqual({ ok: true, id: "p1" });

    const row = await env.DB.prepare("SELECT tags, content, published FROM posts WHERE id = ?").bind("p1").first<{
      tags: string;
      content: string;
      published: number;
    }>();
    expect(row).toEqual({ tags: "[\"admin\",\"test\"]", content: "[\"Body\"]", published: 1 });
    await expect(env.DB.prepare("SELECT action FROM audit_log WHERE target_id = ?").bind("p1").first<{ action: string }>())
      .resolves.toEqual({ action: "create_post" });
    expect(authCalls).toEqual([{ write: true }]);
    expect(updatedTags).toEqual(["posts"]);
  });

  it("updates posts and writes an audit diff", async () => {
    const authCalls: unknown[] = [];
    const updatedTags: string[] = [];
    const crud = makeCrud(authCalls, updatedTags);
    await crud.create({
      id: "p1",
      title: "Hello",
      slug: "hello",
      date: "2026-01-01",
      summary: "",
      tags: [],
      content: [],
      published: true,
    });

    await expect(crud.update("p1", { title: "Updated", published: false })).resolves.toEqual({ ok: true });
    const row = await env.DB.prepare("SELECT title, published FROM posts WHERE id = ?").bind("p1").first<{
      title: string;
      published: number;
    }>();
    expect(row).toEqual({ title: "Updated", published: 0 });
    const audit = await env.DB.prepare("SELECT diff FROM audit_log WHERE action = ?").bind("update_post").first<{ diff: string }>();
    expect(JSON.parse(audit?.diff ?? "{}")).toEqual({ title: "Updated", published: false });
    expect(updatedTags).toEqual(["posts", "posts"]);
  });

  it("deletes posts only after a fresh admin assertion", async () => {
    const authCalls: unknown[] = [];
    const updatedTags: string[] = [];
    const crud = makeCrud(authCalls, updatedTags);
    await crud.create({
      id: "p1",
      title: "Hello",
      slug: "hello",
      date: "2026-01-01",
      summary: "",
      tags: [],
      content: [],
      published: true,
    });

    await expect(crud.remove("p1")).resolves.toEqual({ ok: true });
    await expect(env.DB.prepare("SELECT id FROM posts WHERE id = ?").bind("p1").first()).resolves.toBeNull();
    await expect(env.DB.prepare("SELECT action FROM audit_log WHERE action = ?").bind("delete_post").first<{ action: string }>())
      .resolves.toEqual({ action: "delete_post" });
    expect(authCalls.at(-1)).toEqual({ write: true, fresh: true });
    expect(updatedTags).toEqual(["posts", "posts"]);
  });
});
