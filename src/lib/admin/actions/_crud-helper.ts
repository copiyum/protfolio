import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { writeAudit } from "../audit";

export interface CrudConfig<T> {
  table: string;
  tag: string;
  columns: readonly (keyof T & string)[];
  jsonColumns?: readonly string[];
  orderBy?: string;
  schema: { parse: (input: unknown) => T; partial: () => { parse: (input: unknown) => Partial<T> } };
}

async function getDb() {
  const ctx = await getCloudflareContext({ async: true });
  return (ctx.env as unknown as { DB: D1Database }).DB;
}

async function actor(): Promise<string | null> {
  const h = await headers();
  return h.get("x-actor-credential-id");
}

function rowToObj<T>(row: Record<string, unknown>, jsonColumns: readonly string[]): T {
  const out: Record<string, unknown> = { ...row };
  for (const col of jsonColumns) {
    const v = out[col];
    if (typeof v === "string") {
      try { out[col] = JSON.parse(v); } catch { /* leave as string */ }
    }
  }
  return out as T;
}

function objToParams<T>(obj: Partial<T>, columns: readonly (keyof T & string)[], jsonColumns: readonly string[]): unknown[] {
  return columns.map((c) => {
    const v = (obj as Record<string, unknown>)[c];
    return jsonColumns.includes(c) && v !== undefined && v !== null ? JSON.stringify(v) : v ?? null;
  });
}

export function defineCrud<T extends { id: string }>(config: CrudConfig<T>) {
  const jsonColumns = config.jsonColumns ?? [];
  const orderBy = config.orderBy ?? "sort_order ASC, id ASC";

  return {
    list: async (): Promise<T[]> => {
      const db = await getDb();
      const rows = await db.prepare(`SELECT * FROM ${config.table} ORDER BY ${orderBy}`).all<Record<string, unknown>>();
      return (rows.results ?? []).map((r) => rowToObj<T>(r, jsonColumns));
    },

    get: async (id: string): Promise<T | null> => {
      const db = await getDb();
      const row = await db.prepare(`SELECT * FROM ${config.table} WHERE id = ?`).bind(id).first<Record<string, unknown>>();
      return row ? rowToObj<T>(row, jsonColumns) : null;
    },

    create: async (input: unknown): Promise<{ ok: true; id: string }> => {
      const parsed = config.schema.parse(input) as T;
      const db = await getDb();
      const cols = config.columns;
      const placeholders = cols.map(() => "?").join(", ");
      const values = objToParams(parsed, cols, jsonColumns);
      await db.prepare(`INSERT INTO ${config.table} (${cols.join(", ")}) VALUES (${placeholders})`).bind(...values).run();
      await writeAudit(db, {
        action: `create_${config.table.replace(/s$/, "")}`,
        targetTable: config.table,
        targetId: parsed.id,
        actorCredentialId: (await actor()) ?? undefined,
        diff: parsed as Record<string, unknown>,
      });
      updateTag(config.tag);
      return { ok: true, id: parsed.id };
    },

    update: async (id: string, input: Partial<T>): Promise<{ ok: true }> => {
      const parsed = config.schema.partial().parse(input) as Partial<T>;
      const db = await getDb();
      const existing = await db.prepare(`SELECT * FROM ${config.table} WHERE id = ?`).bind(id).first<Record<string, unknown>>();
      if (!existing) throw new Error("Not found");
      const merged: Record<string, unknown> = { ...existing };
      for (const c of config.columns) {
        const v = (parsed as Record<string, unknown>)[c];
        if (v !== undefined) merged[c] = jsonColumns.includes(c) ? JSON.stringify(v) : v;
      }
      merged.updated_at = new Date().toISOString();
      const sets = config.columns.map((c) => `${c} = ?`).concat("updated_at = ?").join(", ");
      const values = config.columns.map((c) => merged[c]).concat(merged.updated_at);
      await db.prepare(`UPDATE ${config.table} SET ${sets} WHERE id = ?`).bind(...values, id).run();
      await writeAudit(db, {
        action: `update_${config.table.replace(/s$/, "")}`,
        targetTable: config.table,
        targetId: id,
        actorCredentialId: (await actor()) ?? undefined,
        diff: parsed as Record<string, unknown>,
      });
      updateTag(config.tag);
      return { ok: true };
    },

    remove: async (id: string): Promise<{ ok: true }> => {
      const db = await getDb();
      await db.prepare(`DELETE FROM ${config.table} WHERE id = ?`).bind(id).run();
      await writeAudit(db, {
        action: `delete_${config.table.replace(/s$/, "")}`,
        targetTable: config.table,
        targetId: id,
        actorCredentialId: (await actor()) ?? undefined,
      });
      updateTag(config.tag);
      return { ok: true };
    },

    reorder: async (orderedIds: string[]): Promise<{ ok: true }> => {
      const db = await getDb();
      const stride = 1000;
      const stmts = orderedIds.map((id, i) =>
        db.prepare(`UPDATE ${config.table} SET sort_order = ? WHERE id = ?`).bind((i + 1) * stride, id),
      );
      await db.batch(stmts);
      await writeAudit(db, {
        action: `reorder_${config.table}`,
        targetTable: config.table,
        actorCredentialId: (await actor()) ?? undefined,
      });
      updateTag(config.tag);
      return { ok: true };
    },
  };
}