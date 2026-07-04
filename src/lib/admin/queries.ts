import { getEntityPlugin } from "./entities";
import { EntityRepository } from "./entities/repository";
import { rscGuard } from "./rsc-guard";
import { readProfileSettings, readSeoDefaults } from "./singletons";
import type { ProfileSettings } from "@/lib/profile-settings";
import { listAdminVisitorNotes, type AdminVisitorNote } from "@/lib/visitor-notes";

export type AdminEntityRow = Record<string, unknown> & { id: string };

export async function getAdminDb(): Promise<D1Database> {
  return (await rscGuard()).db;
}

export async function listEntityRows(entity: string): Promise<AdminEntityRow[]> {
  const plugin = getEntityPlugin(entity);
  if (!plugin) throw new Error("Unknown admin entity");
  const db = await getAdminDb();
  return new EntityRepository<AdminEntityRow>(db, plugin.db).list();
}

export async function getEntityRow(entity: string, id: string): Promise<AdminEntityRow | null> {
  const plugin = getEntityPlugin(entity);
  if (!plugin) throw new Error("Unknown admin entity");
  const db = await getAdminDb();
  return new EntityRepository<AdminEntityRow>(db, plugin.db).findById(id);
}

export async function listFeatureFlags(): Promise<{ key: string; value: unknown }[]> {
  const db = await getAdminDb();
  const rows = await db.prepare("SELECT key, value FROM feature_flags ORDER BY key").all<{ key: string; value: string }>();
  return (rows.results ?? []).map((row) => {
    try {
      return { key: row.key, value: JSON.parse(row.value) as unknown };
    } catch {
      return { key: row.key, value: row.value };
    }
  });
}

export async function getSeoDefaults() {
  const db = await getAdminDb();
  return readSeoDefaults(db);
}

export async function getProfileSettings(): Promise<ProfileSettings> {
  const db = await getAdminDb();
  return readProfileSettings(db);
}

export interface AuditRow {
  id: string;
  actor_credential_id: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  ip: string | null;
  ts: string;
}

export async function listAuditRows(filters: { actor?: string; table?: string }): Promise<AuditRow[]> {
  const db = await getAdminDb();
  const where: string[] = [];
  const args: unknown[] = [];
  if (filters.actor) {
    where.push("actor_credential_id = ?");
    args.push(filters.actor);
  }
  if (filters.table) {
    where.push("target_table = ?");
    args.push(filters.table);
  }
  const result = await db
    .prepare(`SELECT id, actor_credential_id, action, target_table, target_id, ip, ts FROM audit_log ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY ts DESC LIMIT 200`)
    .bind(...args)
    .all<AuditRow>();
  return result.results ?? [];
}

export interface PasskeyRow {
  credential_id: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
}

export async function listPasskeys(): Promise<PasskeyRow[]> {
  const db = await getAdminDb();
  const result = await db
    .prepare("SELECT credential_id, name, created_at, last_used_at FROM passkeys ORDER BY created_at")
    .all<PasskeyRow>();
  return result.results ?? [];
}

export async function listVisitorNotes(): Promise<AdminVisitorNote[]> {
  const db = await getAdminDb();
  return listAdminVisitorNotes(db);
}
