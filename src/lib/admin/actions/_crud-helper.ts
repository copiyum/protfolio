import { updateTag } from "next/cache";
import { EntityRepository } from "../entities/repository";
import { requireActionAdmin } from "./_security";

export interface CrudConfig<T> {
  table: string;
  tag: string;
  columns: readonly (keyof T & string)[];
  jsonColumns?: readonly string[];
  booleanColumns?: readonly string[];
  orderBy?: string;
  schema: { parse: (input: unknown) => T; partial: () => { parse: (input: unknown) => Partial<T> } };
}

export interface CrudDeps {
  requireActionAdmin?: typeof requireActionAdmin;
  updateTag?: typeof updateTag;
}

export function defineCrud<T extends { id: string }>(config: CrudConfig<T>, deps: CrudDeps = {}) {
  const requireAdmin = deps.requireActionAdmin ?? requireActionAdmin;
  const invalidateTag = deps.updateTag ?? updateTag;
  const jsonColumns = config.jsonColumns ?? [];
  const booleanColumns = config.booleanColumns ?? [];
  const orderBy = config.orderBy ?? "sort_order ASC, id ASC";

  return {
    list: async (): Promise<T[]> => {
      const admin = await requireAdmin();
      return new EntityRepository<T>(admin.db, { ...config, orderBy, jsonColumns, booleanColumns }).list();
    },

    get: async (id: string): Promise<T | null> => {
      const admin = await requireAdmin();
      return new EntityRepository<T>(admin.db, { ...config, orderBy, jsonColumns, booleanColumns }).findById(id);
    },

    create: async (input: unknown): Promise<{ ok: true; id: string }> => {
      const admin = await requireAdmin({ write: true });
      const parsed = config.schema.parse(input) as T;
      const db = admin.db;
      const repository = new EntityRepository<T>(db, { ...config, orderBy, jsonColumns, booleanColumns });
      const audit = admin.prepareAudit({
        action: `create_${config.table.replace(/s$/, "")}`,
        targetTable: config.table,
        targetId: parsed.id,
        diff: parsed as Record<string, unknown>,
      });
      await db.batch([
        repository.insertStatement(parsed),
        audit.statement,
      ]);
      invalidateTag(config.tag);
      return { ok: true, id: parsed.id };
    },

    update: async (id: string, input: Partial<T>): Promise<{ ok: true }> => {
      const admin = await requireAdmin({ write: true });
      const parsed = config.schema.partial().parse(input) as Partial<T>;
      const db = admin.db;
      const repository = new EntityRepository<T>(db, { ...config, orderBy, jsonColumns, booleanColumns });
      const existing = await repository.findRawById(id);
      if (!existing) throw new Error("Not found");
      const inputRecord = input && typeof input === "object" ? input as Record<string, unknown> : {};
      const merged: Record<string, unknown> = { ...existing };
      const diff: Record<string, unknown> = {};
      for (const c of config.columns) {
        if (!Object.prototype.hasOwnProperty.call(inputRecord, c)) continue;
        const v = (parsed as Record<string, unknown>)[c];
        if (v !== undefined) {
          merged[c] = jsonColumns.includes(c) ? JSON.stringify(v) : v;
          diff[c] = v;
        }
      }
      const updatedAt = new Date().toISOString();
      const audit = admin.prepareAudit({
        action: `update_${config.table.replace(/s$/, "")}`,
        targetTable: config.table,
        targetId: id,
        diff,
      });
      await db.batch([
        repository.updateAllStatement(id, merged, updatedAt),
        audit.statement,
      ]);
      invalidateTag(config.tag);
      return { ok: true };
    },

    remove: async (id: string): Promise<{ ok: true }> => {
      const admin = await requireAdmin({ write: true, fresh: true });
      const db = admin.db;
      const repository = new EntityRepository<T>(db, { ...config, orderBy, jsonColumns, booleanColumns });
      const audit = admin.prepareAudit({
        action: `delete_${config.table.replace(/s$/, "")}`,
        targetTable: config.table,
        targetId: id,
      });
      await db.batch([
        repository.deleteStatement(id),
        audit.statement,
      ]);
      invalidateTag(config.tag);
      return { ok: true };
    },

    reorder: async (orderedIds: string[]): Promise<{ ok: true }> => {
      const admin = await requireAdmin({ write: true });
      const db = admin.db;
      const repository = new EntityRepository<T>(db, { ...config, orderBy, jsonColumns, booleanColumns });
      const audit = admin.prepareAudit({
        action: `reorder_${config.table}`,
        targetTable: config.table,
      });
      await db.batch([...repository.reorderStatements(orderedIds), audit.statement]);
      invalidateTag(config.tag);
      return { ok: true };
    },
  };
}
