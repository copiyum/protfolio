import type { z } from "zod";

export const ENTITY_SLUGS = [
  "posts",
  "projects",
  "experiences",
  "social-links",
  "tech-stack",
  "bento",
  "nav",
] as const;

export type EntitySlug = (typeof ENTITY_SLUGS)[number];

export interface EntityDbConfig<TInput extends { id: string } = { id: string } & Record<string, unknown>> {
  table: string;
  columns: readonly (keyof TInput & string)[];
  jsonColumns?: readonly string[];
  booleanColumns?: readonly string[];
  orderBy?: string;
}

export interface EntityAdminColumn {
  key: string;
  label: string;
}

export interface EntityPlugin<
  TDomain = unknown,
  TInput extends { id: string } = { id: string } & Record<string, unknown>,
> {
  slug: EntitySlug;
  label: string;
  schema: z.ZodObject<z.ZodRawShape>;
  db: EntityDbConfig<TInput>;
  tag: string;
  fallback: () => TDomain[] | Promise<TDomain[]>;
  read: (db: D1Database) => Promise<TDomain[]>;
  admin: {
    columns: EntityAdminColumn[];
  };
}

export type AnyEntityPlugin = EntityPlugin<unknown, { id: string } & Record<string, unknown>>;
