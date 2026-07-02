"use server";
import { updateTag } from "next/cache";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { headers } from "next/headers";
import { FeatureFlagInput } from "../schema/feature-flags";
import { writeAudit } from "../audit";

// Feature flags use `key` as PK, not `id`. Special-case instead of forcing generic shape.
export async function listFlags() {
  const ctx = await getCloudflareContext({ async: true });
  const db = (ctx.env as unknown as { DB: D1Database }).DB;
  const rows = await db.prepare("SELECT key, value FROM feature_flags ORDER BY key").all<{ key: string; value: string }>();
  return rows.results.map((r) => ({ key: r.key, value: JSON.parse(r.value) }));
}

export async function setFlag(input: unknown): Promise<{ ok: true }> {
  const parsed = FeatureFlagInput.parse(input);
  const ctx = await getCloudflareContext({ async: true });
  const db = (ctx.env as unknown as { DB: D1Database }).DB;
  const h = await headers();
  await db.prepare(
    "INSERT INTO feature_flags (key, value, updated_at) VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
  ).bind(parsed.key, JSON.stringify(parsed.value)).run();
  await writeAudit(db, {
    action: "set_flag",
    targetTable: "feature_flags",
    targetId: parsed.key,
    actorCredentialId: h.get("x-actor-credential-id") ?? undefined,
    diff: { value: parsed.value },
  });
  updateTag("flags");
  updateTag(`flag:${parsed.key}`);
  return { ok: true };
}

export async function deleteFlag(key: string): Promise<{ ok: true }> {
  const ctx = await getCloudflareContext({ async: true });
  const db = (ctx.env as unknown as { DB: D1Database }).DB;
  const h = await headers();
  await db.prepare("DELETE FROM feature_flags WHERE key = ?").bind(key).run();
  await writeAudit(db, {
    action: "delete_flag",
    targetTable: "feature_flags",
    targetId: key,
    actorCredentialId: h.get("x-actor-credential-id") ?? undefined,
  });
  updateTag("flags");
  return { ok: true };
}