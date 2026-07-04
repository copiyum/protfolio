import { rowToObj } from "../row";
import type { EntityDbConfig } from "./types";

export class EntityRepository<T extends { id: string }> {
  private readonly jsonColumns: readonly string[];
  private readonly booleanColumns: readonly string[];

  constructor(
    private readonly db: D1Database,
    private readonly config: EntityDbConfig<T>,
  ) {
    this.jsonColumns = config.jsonColumns ?? [];
    this.booleanColumns = config.booleanColumns ?? [];
  }

  private get orderBy() {
    return this.config.orderBy ?? "sort_order ASC, id ASC";
  }

  private toParams(obj: Partial<T> | Record<string, unknown>): unknown[] {
    const record = obj as Record<string, unknown>;
    return this.config.columns.map((column) => {
      const value = record[column];
      if (this.booleanColumns.includes(column) && value !== undefined && value !== null) return value ? 1 : 0;
      if (this.jsonColumns.includes(column) && value !== undefined && value !== null) return JSON.stringify(value);
      return value ?? null;
    });
  }

  toEntity(row: Record<string, unknown>): T {
    return rowToObj<T>(row, this.jsonColumns, this.booleanColumns);
  }

  async list(): Promise<T[]> {
    const rows = await this.db
      .prepare(`SELECT * FROM ${this.config.table} ORDER BY ${this.orderBy}`)
      .all<Record<string, unknown>>();
    return (rows.results ?? []).map((row) => this.toEntity(row));
  }

  async findById(id: string): Promise<T | null> {
    const row = await this.findRawById(id);
    return row ? this.toEntity(row) : null;
  }

  async findRawById(id: string): Promise<Record<string, unknown> | null> {
    return this.db
      .prepare(`SELECT * FROM ${this.config.table} WHERE id = ?`)
      .bind(id)
      .first<Record<string, unknown>>();
  }

  insertStatement(input: T): D1PreparedStatement {
    const placeholders = this.config.columns.map(() => "?").join(", ");
    return this.db
      .prepare(`INSERT INTO ${this.config.table} (${this.config.columns.join(", ")}) VALUES (${placeholders})`)
      .bind(...this.toParams(input));
  }

  updateAllStatement(id: string, values: Partial<T> | Record<string, unknown>, updatedAt: string): D1PreparedStatement {
    const sets = this.config.columns.map((column) => `${column} = ?`).concat("updated_at = ?").join(", ");
    return this.db
      .prepare(`UPDATE ${this.config.table} SET ${sets} WHERE id = ?`)
      .bind(...this.toParams(values), updatedAt, id);
  }

  deleteStatement(id: string): D1PreparedStatement {
    return this.db.prepare(`DELETE FROM ${this.config.table} WHERE id = ?`).bind(id);
  }

  reorderStatements(orderedIds: string[], stride = 1000): D1PreparedStatement[] {
    return orderedIds.map((id, index) =>
      this.db.prepare(`UPDATE ${this.config.table} SET sort_order = ? WHERE id = ?`).bind((index + 1) * stride, id),
    );
  }
}
