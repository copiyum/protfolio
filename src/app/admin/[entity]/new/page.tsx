import { notFound } from "next/navigation";
import { registry, ENTITY_KEYS } from "@/lib/admin/registry";
import { EntityForm } from "@/components/admin/EntityForm";

// Admin pages are auth-gated at runtime; never pre-render at build.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateStaticParams() {
  return ENTITY_KEYS.map((entity) => ({ entity }));
}

export default async function NewEntityPage({ params }: { params: Promise<{ entity: string }> }) {
  const { entity } = await params;
  const cfg = registry[entity];
  if (!cfg) notFound();

  async function save(values: unknown) {
    "use server";
    await cfg.actions.create(values);
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">New {cfg.label.replace(/s$/, "")}</h1>
      <EntityForm schema={cfg.schema} defaultValues={{} as never} onSubmit={save} submitLabel="Create" />
    </div>
  );
}