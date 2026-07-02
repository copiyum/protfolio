import { notFound } from "next/navigation";
import { registry, ENTITY_KEYS } from "@/lib/admin/registry";
import { EntityForm } from "@/components/admin/EntityForm";

export async function generateStaticParams() {
  // Static params are not knowable at build time (rows come from D1).
  return [];
}

export default async function EditEntityPage({
  params,
}: {
  params: Promise<{ entity: string; id: string }>;
}) {
  const { entity, id } = await params;
  const cfg = registry[entity];
  if (!cfg) notFound();
  const row = (await cfg.actions.get(id)) as Record<string, unknown> | null;
  if (!row) notFound();

  async function save(values: unknown) {
    "use server";
    await cfg.actions.update(id, values);
  }

  async function remove() {
    "use server";
    await cfg.actions.remove(id);
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Edit {cfg.label.replace(/s$/, "")}</h1>
      <EntityForm schema={cfg.schema} defaultValues={row as never} onSubmit={save} />
      <form action={remove} className="mt-8 border-t pt-6">
        <button className="rounded border border-red-500/30 px-3 py-1 text-sm text-red-500 hover:bg-red-500/10">
          Delete
        </button>
      </form>
    </div>
  );
}