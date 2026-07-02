import { getCloudflareContext } from "@opennextjs/cloudflare";

interface AuditRow {
  id: string;
  actor_credential_id: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  ip: string | null;
  ts: string;
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ actor?: string; table?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await getCloudflareContext({ async: true });
  const db = (ctx.env as unknown as { DB: D1Database }).DB;

  const filters: string[] = [];
  const args: unknown[] = [];
  if (sp.actor) {
    filters.push("actor_credential_id = ?");
    args.push(sp.actor);
  }
  if (sp.table) {
    filters.push("target_table = ?");
    args.push(sp.table);
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const result = await db
    .prepare(`SELECT id, actor_credential_id, action, target_table, target_id, ip, ts FROM audit_log ${where} ORDER BY ts DESC LIMIT 200`)
    .bind(...args)
    .all<AuditRow>();
  const rows = result.results;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Audit Log</h1>
      <form className="mb-4 flex gap-2">
        <input
          name="actor"
          placeholder="Actor credential id"
          defaultValue={sp.actor ?? ""}
          className="flex-1 rounded border border-[color:var(--foreground)]/20 bg-transparent px-2 py-1 text-sm"
        />
        <input
          name="table"
          placeholder="Target table"
          defaultValue={sp.table ?? ""}
          className="flex-1 rounded border border-[color:var(--foreground)]/20 bg-transparent px-2 py-1 text-sm"
        />
        <button className="rounded bg-[color:var(--foreground)] px-3 py-1 text-sm text-[color:var(--background)]">
          Filter
        </button>
      </form>
      <div className="overflow-x-auto rounded border border-[color:var(--foreground)]/10">
        <table className="w-full text-sm">
          <thead className="bg-[color:var(--foreground)]/5 text-left">
            <tr>
              <th className="p-2 font-medium">Time</th>
              <th className="p-2 font-medium">Actor</th>
              <th className="p-2 font-medium">Action</th>
              <th className="p-2 font-medium">Target</th>
              <th className="p-2 font-medium">IP</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-[color:var(--foreground)]/50">
                  No entries.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-[color:var(--foreground)]/5">
                  <td className="p-2 font-mono text-xs">{r.ts}</td>
                  <td className="p-2 font-mono text-xs">{r.actor_credential_id?.slice(0, 12) ?? "—"}</td>
                  <td className="p-2">{r.action}</td>
                  <td className="p-2 text-xs">
                    {r.target_table}/{r.target_id}
                  </td>
                  <td className="p-2 text-xs">{r.ip ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}