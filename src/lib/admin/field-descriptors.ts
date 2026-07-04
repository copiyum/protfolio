import type { z } from "zod";

export type EntityFieldType =
  | "array"
  | "checkbox"
  | "color"
  | "date"
  | "json"
  | "number"
  | "select"
  | "textarea"
  | "text";

export interface EntityFieldDescriptor {
  key: string;
  type: EntityFieldType;
  nullable: boolean;
  optional: boolean;
  defaultValue?: unknown;
  options?: string[];
  rows?: number;
}

type ZodLike = {
  def: {
    type: string;
    innerType?: ZodLike;
    checks?: Array<{ _zod?: { def?: Record<string, unknown> } }>;
    entries?: Record<string, string>;
  };
};

function unwrap(schema: ZodLike) {
  let current = schema;
  let nullable = false;
  let optional = false;
  let defaultValue: unknown;

  while (["default", "optional", "nullable"].includes(current.def.type)) {
    if (current.def.type === "default") defaultValue = (current.def as { defaultValue?: unknown }).defaultValue;
    if (current.def.type === "optional") optional = true;
    if (current.def.type === "nullable") nullable = true;
    if (!current.def.innerType) break;
    current = current.def.innerType;
  }

  return { schema: current, nullable, optional, defaultValue };
}

function maxStringLength(schema: ZodLike): number | null {
  for (const check of schema.def.checks ?? []) {
    const def = check._zod?.def;
    if (def?.check === "max_length" && typeof def.maximum === "number") return def.maximum;
  }
  return null;
}

function fieldTypeFromSchema(key: string, schema: ZodLike): Pick<EntityFieldDescriptor, "type" | "options" | "rows"> {
  const type = schema.def.type;
  if (type === "boolean") return { type: "checkbox" };
  if (type === "number") return { type: "number" };
  if (type === "array") return { type: "array", rows: key === "content" ? 8 : 4 };
  if (type === "object" || type === "record") return { type: "json", rows: 8 };
  if (type === "enum") return { type: "select", options: Object.values(schema.def.entries ?? {}) };
  if (key === "date") return { type: "date" };
  if (key === "color") return { type: "color" };

  const max = maxStringLength(schema);
  if (max !== null && max > 700) return { type: "textarea", rows: 5 };
  return { type: "text" };
}

export function entityFieldDescriptors(schema: z.ZodObject<z.ZodRawShape>): EntityFieldDescriptor[] {
  return Object.entries(schema.shape).map(([key, raw]) => {
    const { schema: base, nullable, optional, defaultValue } = unwrap(raw as unknown as ZodLike);
    return {
      key,
      nullable,
      optional,
      defaultValue,
      ...fieldTypeFromSchema(key, base),
    };
  });
}
