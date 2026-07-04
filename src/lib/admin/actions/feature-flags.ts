"use server";
import { updateTag } from "next/cache";
import { FeatureFlagInput } from "../schema/feature-flags";
import { requireActionAdmin } from "./_security";

function parseFlagInput(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const record = input as Record<string, unknown>;
  const value = record.value;
  if (typeof value !== "string") return input;
  const trimmed = value.trim();
  if (!trimmed) return { ...record, value: "" };
  try {
    return { ...record, value: JSON.parse(trimmed) };
  } catch {
    return { ...record, value };
  }
}

// Feature flags use `key` as PK, not `id`. Special-case instead of forcing generic shape.
export async function listFlags() {
  const admin = await requireActionAdmin();
  const db = admin.db;
  const rows = await db.prepare("SELECT key, value FROM feature_flags ORDER BY key").all<{ key: string; value: string }>();
  return rows.results.map((r) => {
    try {
      return { key: r.key, value: JSON.parse(r.value) as unknown };
    } catch {
      return { key: r.key, value: r.value };
    }
  });
}

export async function setFlag(input: unknown): Promise<{ ok: true }> {
  const admin = await requireActionAdmin({ write: true });
  const parsed = FeatureFlagInput.parse(parseFlagInput(input));
  const db = admin.db;
  const audit = admin.prepareAudit({
    action: "set_flag",
    targetTable: "feature_flags",
    targetId: parsed.key,
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
  const db = admin.db;
  const audit = admin.prepareAudit({
    action: "delete_flag",
    targetTable: "feature_flags",
    targetId: key,
  });
  await db.batch([
    db.prepare("DELETE FROM feature_flags WHERE key = ?").bind(key),
    audit.statement,
  ]);
  updateTag("flags");
  return { ok: true };
}
