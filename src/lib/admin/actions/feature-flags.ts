"use server";
import { updateTag } from "next/cache";
import { FeatureFlagInput } from "../schema/feature-flags";
import { prepareAudit } from "../audit";
import { requireActionAdmin } from "./_security";

// Feature flags use `key` as PK, not `id`. Special-case instead of forcing generic shape.
export async function listFlags() {
  const admin = await requireActionAdmin();
  const db = admin.env.DB;
  const rows = await db.prepare("SELECT key, value FROM feature_flags ORDER BY key").all<{ key: string; value: string }>();
  return rows.results.map((r) => ({ key: r.key, value: JSON.parse(r.value) }));
}

export async function setFlag(input: unknown): Promise<{ ok: true }> {
  const admin = await requireActionAdmin({ write: true });
  const parsed = FeatureFlagInput.parse(input);
  const db = admin.env.DB;
  const audit = prepareAudit(db, {
    action: "set_flag",
    targetTable: "feature_flags",
    targetId: parsed.key,
    actorCredentialId: admin.credentialId,
    ip: admin.meta.ip,
    ua: admin.meta.ua,
    diff: { value: parsed.value },
  });
  await db.batch([
    db.prepare(
      "INSERT INTO feature_flags (key, value, updated_at) VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
    ).bind(parsed.key, JSON.stringify(parsed.value)),
    audit.statement,
  ]);
  updateTag("flags");
  updateTag(`flag:${parsed.key}`);
  return { ok: true };
}

export async function deleteFlag(key: string): Promise<{ ok: true }> {
  const admin = await requireActionAdmin({ write: true, fresh: true });
  const db = admin.env.DB;
  const audit = prepareAudit(db, {
    action: "delete_flag",
    targetTable: "feature_flags",
    targetId: key,
    actorCredentialId: admin.credentialId,
    ip: admin.meta.ip,
    ua: admin.meta.ua,
  });
  await db.batch([
    db.prepare("DELETE FROM feature_flags WHERE key = ?").bind(key),
    audit.statement,
  ]);
  updateTag("flags");
  return { ok: true };
}
