import { notFound } from "next/navigation";
import { registry, ENTITY_KEYS } from "@/lib/admin/registry";
import { EntityTable } from "@/components/admin/EntityTable";

export async function generateStaticParams() {
  return ENTITY_KEYS.map((entity) => ({ entity }));
}

export default async function EntityListPage({ params }: { params: Promise<{ entity: string }> }) {
  const { entity } = await params;
  const cfg = registry[entity];
  if (!cfg) notFound();
  const rows = (await cfg.actions.list()) as unknown as Record<string, unknown>[];
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">{cfg.label}</h1>
      <EntityTable
        rows={rows as { id: string }[]}
        columns={cfg.columns.map((c) => ({ key: c.key, label: c.label }))}
        editHref={(id) => `/admin/${entity}/${id}`}
        newHref={`/admin/${entity}/new`}
      />
    </div>
  );
}