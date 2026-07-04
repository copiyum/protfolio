import type { z } from "zod";
import { entityPlugins, type EntityAdminColumn, type EntityDbConfig } from "./entities";

export type EntityDataConfig = EntityDbConfig;

export interface EntityConfig {
  label: string;
  schema: z.ZodObject<z.ZodRawShape>;
  data: EntityDataConfig;
  columns: EntityAdminColumn[];
}

export const registry = Object.fromEntries(
  entityPlugins.map((plugin) => [
    plugin.slug,
    {
      label: plugin.label,
      schema: plugin.schema,
      data: plugin.db,
      columns: plugin.admin.columns,
    },
  ]),
) as Record<string, EntityConfig>;

export const ENTITY_KEYS = entityPlugins.map((plugin) => plugin.slug);
