import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:workers";
import { applyD1Migrations } from "cloudflare:test";
import { createD1Client, type PostRow } from "@/lib/admin/db";

describe("D1 client", () => {
  beforeEach(async () => {
    // D1 storage is isolated per test. Re-apply migrations from the
    // TEST_MIGRATIONS binding injected by vitest.config.mts.
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
    await env.DB.exec(
      "DELETE FROM posts; INSERT INTO posts (id, slug, title, date) VALUES ('p1','hello','Hello','2026-01-01');"
    );
  });

  it("caches prepared statements and reads a row", async () => {
    const db = createD1Client(env.DB);
    const post = await db.first<PostRow>("posts", "id = ?", ["p1"]);
    expect(post?.slug).toBe("hello");
  });
});
