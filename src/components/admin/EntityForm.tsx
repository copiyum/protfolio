"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { z as zv } from "zod";

export function EntityForm<S extends z.ZodTypeAny>({
  schema,
  defaultValues,
  onSubmit,
  submitLabel = "Save",
}: {
  schema: S;
  defaultValues: z.infer<S>;
  onSubmit: (v: z.infer<S>) => Promise<void>;
  submitLabel?: string;
}) {
  // zod v4: output<S> is the safe "value" type; cast to any for react-hook-form
  // generics that still expect FieldValues.
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<any>({
    resolver: zodResolver(schema as any),
    defaultValues,
  });
  const fields = Object.keys((schema as unknown as { shape: Record<string, unknown> }).shape ?? {});
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl space-y-3">
      {fields.map((k) => {
        const err = (errors as Record<string, { message?: string } | undefined>)[k]?.message;
        return (
          <div key={k}>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-[color:var(--foreground)]/60">
              {k}
            </label>
            <input {...register(k)} className="w-full rounded border border-[color:var(--foreground)]/20 bg-transparent px-2 py-1 text-sm" />
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