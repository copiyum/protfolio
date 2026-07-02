"use client";
import { useForm, type DefaultValues, type FieldValues, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

export function EntityForm<S extends z.ZodObject<z.ZodRawShape>>({
  schema,
  defaultValues,
  onSubmit,
  submitLabel = "Save",
}: {
  schema: S;
  defaultValues: z.input<S>;
  onSubmit: (v: z.output<S>) => Promise<void>;
  submitLabel?: string;
}) {
  type Input = z.input<S> & FieldValues;
  type Output = z.output<S> & FieldValues;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Input, unknown, Output>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as DefaultValues<Input>,
  });
  const fields = Object.keys(schema.shape);
  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values))} className="max-w-xl space-y-3">
      {fields.map((k) => {
        const err = (errors as Record<string, { message?: string } | undefined>)[k]?.message;
        return (
          <div key={k}>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-[color:var(--foreground)]/60">
              {k}
            </label>
            <input {...register(k as Path<Input>)} className="w-full rounded border border-[color:var(--foreground)]/20 bg-transparent px-2 py-1 text-sm" />
            {err && <p className="mt-1 text-xs text-red-500">{err}</p>}
          </div>
        );
      })}
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-[color:var(--foreground)] px-3 py-1 text-sm text-[color:var(--background)] disabled:opacity-50"
      >
        {isSubmitting ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
