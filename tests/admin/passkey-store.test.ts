import { beforeEach, describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import { applyD1Migrations } from "cloudflare:test";
import { deletePasskeyIfAboveMinimum } from "@/lib/admin/passkey-store";

describe("passkey minimum", () => {
  beforeEach(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
    await env.DB.exec("DELETE FROM passkeys;");
    for (const id of ["a", "b", "c", "d"]) {
      await env.DB.prepare(
        "INSERT INTO passkeys (credential_id, public_key, counter, transports, name) VALUES (?, X'00', 0, '[]', ?)",
      ).bind(id, id).run();
    }
  });

  it("never crosses the minimum under concurrent deletion", async () => {
    const results = await Promise.all([
      deletePasskeyIfAboveMinimum(env.DB, "a"),
      deletePasskeyIfAboveMinimum(env.DB, "b"),
      deletePasskeyIfAboveMinimum(env.DB, "c"),
    ]);
    expect(results.filter(Boolean)).toHaveLength(2);
    const row = await env.DB.prepare("SELECT COUNT(*) AS count FROM passkeys").first<{ count: number }>();
    expect(row?.count).toBe(2);
  });
});
