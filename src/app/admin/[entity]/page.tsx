import { notFound } from "next/navigation";
import { registry } from "@/lib/admin/registry";
import { listEntityRows } from "@/lib/admin/queries";
import { EntityTable } from "@/components/admin/EntityTable";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EntityListPage({ params }: { params: Promise<{ entity: string }> }) {
  const { entity } = await params;
  const cfg = registry[entity];
  if (!cfg) notFound();
  const rows = await listEntityRows(entity);
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">{cfg.label}</h1>
      <EntityTable
        rows={rows as { id: string }[]}
        columns={cfg.columns.map((c) => ({ key: c.key, label: c.label }))}
        editHref={(id) => `/admin/${entity}/${id}`}
        newHref={`/admin/${entity}/new`}
        caption={`${cfg.label} rows`}
      />
    </div>
  );
}
