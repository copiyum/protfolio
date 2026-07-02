import { deletePasskey } from "@/lib/admin/actions/passkey";
import { getCloudflareContext } from "@opennextjs/cloudflare";

interface PasskeyRow {
  credential_id: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
}

export default async function PasskeysPage() {
  const ctx = await getCloudflareContext({ async: true });
  const db = (ctx.env as unknown as { DB: D1Database }).DB;
  const result = await db
    .prepare("SELECT credential_id, name, created_at, last_used_at FROM passkeys ORDER BY created_at")
    .all<PasskeyRow>();
  const rows = result.results;
  const count = rows.length;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Passkeys</h1>
        <a href="/admin/passkeys/register" className="rounded bg-[color:var(--foreground)] px-3 py-1 text-sm text-[color:var(--background)]">
          + Register
        </a>
      </div>
      <p className="mb-4 text-sm text-[color:var(--foreground)]/60">
        {count} registered. Minimum 2 required for safety.
      </p>
      <div className="overflow-x-auto rounded border border-[color:var(--foreground)]/10">
        <table className="w-full text-sm">
          <thead className="bg-[color:var(--foreground)]/5 text-left">
            <tr>
              <th className="p-2 font-medium">Name</th>
              <th className="p-2 font-medium">Created</th>
              <th className="p-2 font-medium">Last Used</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-4 text-center text-[color:var(--foreground)]/50">
                  No passkeys yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.credential_id} className="border-t border-[color:var(--foreground)]/5">
                  <td className="p-2">{r.name}</td>
                  <td className="p-2 font-mono text-xs">{r.created_at}</td>
                  <td className="p-2 font-mono text-xs">{r.last_used_at ?? "—"}</td>
                  <td className="p-2">
                    <form
                      action={async () => {
                        "use server";
                        await deletePasskey(r.credential_id);
                      }}
                    >
                      <button
                        disabled={count <= 1}
                        className="text-xs text-red-500 hover:underline disabled:opacity-30"
                      >
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}