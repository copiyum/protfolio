export interface D1Client {
  first<T>(table: string, where: string, params: unknown[]): Promise<T | null>;
  all<T>(table: string, where: string, params: unknown[]): Promise<T[]>;
  run(sql: string, params: unknown[]): Promise<D1Result>;
}

export function createD1Client(d1: D1Database): D1Client {
  const cache = new Map<string, D1PreparedStatement>();
  const prep = (sql: string) => {
    let s = cache.get(sql);
    if (!s) {
      s = d1.prepare(sql);
      cache.set(sql, s);
    }
    return s;
  };
  return {
    async first<T>(table: string, where: string, params: unknown[]) {
      const r = await prep(`SELECT * FROM ${table} WHERE ${where} LIMIT 1`)
        .bind(...params)
        .first<T>();
      return r as T | null;
    },
    async all<T>(table: string, where: string, params: unknown[]) {
      const r = await prep(`SELECT * FROM ${table} WHERE ${where}`)
        .bind(...params)
        .all<T>();
      return (r.results ?? []) as T[];
    },
    async run(sql, params) {
      return prep(sql).bind(...params).run();
    },
  };
}

export type PostRow = {
  id: string;
  slug: string;
  title: string;
  date: string;
  summary: string;
  tags: string;
  cover: string | null;
  content: string;
  published: number;
  created_at: string;
  updated_at: string;
};
