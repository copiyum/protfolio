"use client";

import { useMemo, useState, type ComponentType, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { AdminActionResult } from "@/lib/admin/actions/result";
import { redirectFromDigest, slugify } from "@/lib/admin/client-utils";
import type { EntityFieldDescriptor, EntityFieldType } from "@/lib/admin/field-descriptors";
import { AdminButton } from "./AdminButton";
import { ErrorBanner } from "./Banners";

type FieldStateValue = string | boolean;

interface FieldProps {
  field: EntityFieldDescriptor;
  value: FieldStateValue;
  onChange: (value: FieldStateValue) => void;
}

interface FieldRenderer {
  type: EntityFieldType;
  component: ComponentType<FieldProps>;
  serialize: (field: EntityFieldDescriptor, value: unknown) => FieldStateValue;
  deserialize: (field: EntityFieldDescriptor, value: FieldStateValue) => unknown;
}

const inputClass = "w-full rounded border border-[color:var(--foreground)]/20 bg-transparent px-2 py-1 text-sm";
const monoInputClass = `${inputClass} font-mono`;

function fallbackValue(field: EntityFieldDescriptor): unknown {
  if (field.defaultValue !== undefined) return field.defaultValue;
  if (field.type === "checkbox") return false;
  if (field.type === "array") return [];
  if (field.type === "json") return field.nullable ? null : {};
  return "";
}

function nullableText(field: EntityFieldDescriptor, value: FieldStateValue): unknown {
  const raw = String(value).trim();
  if (raw) return raw;
  if (field.nullable) return null;
  if (field.optional) return undefined;
  return "";
}

function splitList(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function TextField({ value, onChange }: FieldProps) {
  return (
    <input
      type="text"
      value={String(value ?? "")}
      onChange={(event) => onChange(event.target.value)}
      className={inputClass}
    />
  );
}

function DateField(props: FieldProps) {
  return (
    <input
      type="date"
      value={String(props.value ?? "")}
      onChange={(event) => props.onChange(event.target.value)}
      className={inputClass}
    />
  );
}

function ColorField(props: FieldProps) {
  return (
    <input
      type="color"
      value={String(props.value || props.field.defaultValue || "#9ca3af")}
      onChange={(event) => props.onChange(event.target.value)}
      className={inputClass}
    />
  );
}

function NumberField({ value, onChange }: FieldProps) {
  return (
    <input
      type="number"
      value={String(value ?? "")}
      onChange={(event) => onChange(event.target.value)}
      className={inputClass}
    />
  );
}

function CheckboxField({ value, onChange }: FieldProps) {
  return (
    <label className="inline-flex items-center gap-2 rounded border border-[color:var(--foreground)]/20 px-2 py-1 text-sm">
      <input
        type="checkbox"
        checked={Boolean(value)}
        onChange={(event) => onChange(event.target.checked)}
      />
      Enabled
    </label>
  );
}

function TextareaField({ field, value, onChange }: FieldProps) {
  return (
    <textarea
      value={String(value ?? "")}
      onChange={(event) => onChange(event.target.value)}
      rows={field.rows ?? 4}
      className={monoInputClass}
    />
  );
}

function SelectField({ field, value, onChange }: FieldProps) {
  return (
    <select value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} className={inputClass}>
      {(field.options ?? []).map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

const textRenderer: FieldRenderer = {
  type: "text",
  component: TextField,
  serialize(field, value) {
    return String(value ?? fallbackValue(field) ?? "");
  },
  deserialize: nullableText,
};

const textareaRenderer: FieldRenderer = {
  ...textRenderer,
  type: "textarea",
  component: TextareaField,
};

const fieldRenderers: Record<EntityFieldType, FieldRenderer> = {
  text: textRenderer,
  textarea: textareaRenderer,
  date: {
    ...textRenderer,
    type: "date",
    component: DateField,
  },
  color: {
    ...textRenderer,
    type: "color",
    component: ColorField,
  },
  checkbox: {
    type: "checkbox",
    component: CheckboxField,
    serialize(field, value) {
      const source = value ?? fallbackValue(field);
      return source === true || source === 1 || source === "1";
    },
    deserialize(_field, value) {
      return Boolean(value);
    },
  },
  number: {
    type: "number",
    component: NumberField,
    serialize(field, value) {
      return String(value ?? fallbackValue(field) ?? "");
    },
    deserialize(_field, value) {
      const raw = String(value).trim();
      return raw ? Number(raw) : undefined;
    },
  },
  array: {
    type: "array",
    component: TextareaField,
    serialize(field, value) {
      const source = value ?? fallbackValue(field);
      return Array.isArray(source) ? source.join("\n") : "";
    },
    deserialize(_field, value) {
      return splitList(String(value));
    },
  },
  json: {
    type: "json",
    component: TextareaField,
    serialize(field, value) {
      const source = value ?? fallbackValue(field);
      return source === null || source === undefined ? "" : JSON.stringify(source, null, 2);
    },
    deserialize(field, value) {
      const raw = String(value).trim();
      if (!raw) {
        if (field.nullable) return null;
        if (field.optional) return undefined;
        return {};
      }
      try {
        return JSON.parse(raw);
      } catch {
        throw new Error(`${field.key} must be valid JSON`);
      }
    },
  },
  select: {
    ...textRenderer,
    type: "select",
    component: SelectField,
  },
};

function firstNonEmpty(...values: unknown[]): unknown {
  return values.find((value) => typeof value === "string" ? value.trim() : value);
}

function withDerivedFields(payload: Record<string, unknown>): Record<string, unknown> {
  const next = { ...payload };
  if (typeof next.slug === "string" && !next.slug.trim()) {
    const slug = slugify(firstNonEmpty(next.title, next.id));
    if (slug) next.slug = slug;
  }
  if (typeof next.id === "string" && !next.id.trim()) {
    const id = slugify(firstNonEmpty(next.slug, next.title, next.name, next.label, next.company, next.role));
    if (id) next.id = id;
  }
  return next;
}

export function EntityForm({
  fields,
  defaultValues,
  onSubmit,
  submitLabel = "Save",
}: {
  fields: EntityFieldDescriptor[];
  defaultValues: Record<string, unknown>;
  onSubmit: (v: Record<string, unknown>) => Promise<AdminActionResult>;
  submitLabel?: string;
}) {
  const router = useRouter();
  const stableFields = useMemo(() => fields, [fields]);
  const initial = useMemo(() => {
    const src = defaultValues as Record<string, unknown>;
    return Object.fromEntries(stableFields.map((field) => {
      const renderer = fieldRenderers[field.type];
      return [field.key, renderer.serialize(field, src[field.key])];
    })) as Record<string, FieldStateValue>;
  }, [defaultValues, stableFields]);
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const payload = withDerivedFields(Object.fromEntries(stableFields.map((field) => {
        const renderer = fieldRenderers[field.type];
        return [field.key, renderer.deserialize(field, values[field.key] ?? "")];
      })));
      const result = await onSubmit(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.redirectTo) {
        router.push(result.redirectTo);
        router.refresh();
      }
    } catch (err) {
      const redirectTo = redirectFromDigest(err);
      if (redirectTo) {
        router.push(redirectTo);
        router.refresh();
        return;
      }
      setError(err instanceof Error ? err.message : "Unable to save");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-xl space-y-3">
      {stableFields.map((field) => {
        const renderer = fieldRenderers[field.type];
        const Component = renderer.component;
        const value = values[field.key];
        const update = (next: FieldStateValue) => setValues((current) => ({ ...current, [field.key]: next }));
        return (
          <div key={field.key}>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-[color:var(--foreground)]/60">
              {field.key}
            </label>
            <Component field={field} value={value ?? ""} onChange={update} />
          </div>
        );
      })}
      {error && <ErrorBanner>{error}</ErrorBanner>}
      <AdminButton
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Saving..." : submitLabel}
      </AdminButton>
    </form>
  );
}
