import type { AnyEntityPlugin, EntityPlugin } from "../entities";
import { defineCrud } from "./_crud";

export function defineEntityCrud<T extends { id: string }>(plugin: EntityPlugin<unknown, T>) {
  return defineCrud<T>({
    table: plugin.db.table,
    tag: plugin.tag,
    columns: plugin.db.columns,
    jsonColumns: plugin.db.jsonColumns,
    booleanColumns: plugin.db.booleanColumns,
    orderBy: plugin.db.orderBy,
    schema: {
      parse: (input) => plugin.schema.parse(input) as T,
      partial: () => ({
        parse: (input) => plugin.schema.partial().parse(input) as Partial<T>,
      }),
    },
  });
}

export function defineAnyEntityCrud(plugin: AnyEntityPlugin) {
  return defineEntityCrud(plugin);
}
