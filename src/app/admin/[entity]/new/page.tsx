import { notFound } from "next/navigation";
import { registry } from "@/lib/admin/registry";
import { createEntity } from "@/lib/admin/actions/entity";
import { adminAction, type AdminActionResult } from "@/lib/admin/actions/result";
import { entityFieldDescriptors } from "@/lib/admin/field-descriptors";
import { EntityForm } from "@/components/admin/EntityForm";

// Admin pages are auth-gated at runtime; never pre-render at build.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NewEntityPage({ params }: { params: Promise<{ entity: string }> }) {
  const { entity } = await params;
  const cfg = registry[entity];
  if (!cfg) notFound();
  const defaultValues = entity === "posts" ? { date: new Date().toISOString().slice(0, 10) } : {};
  const fields = entityFieldDescriptors(cfg.schema);

  async function save(values: unknown): Promise<AdminActionResult> {
    "use server";
    return adminAction(async () => {
      const result = await createEntity(entity, values);
      return { ok: true, redirectTo: `/admin/${entity}/${result.id}` };
    });
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">New {cfg.label.replace(/s$/, "")}</h1>
      <EntityForm fields={fields} defaultValues={defaultValues} onSubmit={save} submitLabel="Create" />
    </div>
  );
}
