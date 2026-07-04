import { notFound } from "next/navigation";
import { registry } from "@/lib/admin/registry";
import { deleteEntity, updateEntity } from "@/lib/admin/actions/entity";
import { getEntityRow } from "@/lib/admin/queries";
import { adminAction, type AdminActionResult } from "@/lib/admin/actions/result";
import { entityFieldDescriptors } from "@/lib/admin/field-descriptors";
import { AdminActionButton } from "@/components/admin/AdminActionButton";
import { EntityForm } from "@/components/admin/EntityForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EditEntityPage({
  params,
}: {
  params: Promise<{ entity: string; id: string }>;
}) {
  const { entity, id } = await params;
  const cfg = registry[entity];
  if (!cfg) notFound();
  const row = await getEntityRow(entity, id);
  if (!row) notFound();
  const fields = entityFieldDescriptors(cfg.schema);

  async function save(values: unknown): Promise<AdminActionResult> {
    "use server";
    return adminAction(async () => {
      await updateEntity(entity, id, values);
      return { ok: true, redirectTo: `/admin/${entity}` };
    });
  }

  async function remove(): Promise<AdminActionResult> {
    "use server";
    return adminAction(async () => {
      await deleteEntity(entity, id);
      return { ok: true, redirectTo: `/admin/${entity}` };
    });
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Edit {cfg.label.replace(/s$/, "")}</h1>
      <EntityForm fields={fields} defaultValues={row} onSubmit={save} />
      <div className="mt-8 border-t pt-6">
        <AdminActionButton
          action={remove}
          confirmMessage={`Delete this ${cfg.label.replace(/s$/, "").toLowerCase()}?`}
          pendingLabel="Deleting..."
          className="rounded border border-red-500/30 px-3 py-1 text-sm text-red-500 hover:bg-red-500/10 disabled:opacity-50"
        >
          Delete
        </AdminActionButton>
      </div>
    </div>
  );
}
