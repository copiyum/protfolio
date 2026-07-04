import { deletePasskey } from "@/lib/admin/actions/passkey";
import { adminAction } from "@/lib/admin/actions/result";
import { listPasskeys } from "@/lib/admin/queries";
import { AdminActionButton } from "@/components/admin/AdminActionButton";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PasskeysPage() {
  const rows = await listPasskeys();
  const count = rows.length;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Passkeys</h1>
        <Link href="/admin/passkeys/register" className="rounded bg-[color:var(--foreground)] px-3 py-1 text-sm text-[color:var(--background)]">
          + Register
        </Link>
      </div>
      <p className="mb-4 text-sm text-[color:var(--foreground)]/60">
        {count} registered. Minimum 2 required for safety.
      </p>
      <div className="overflow-x-auto rounded border border-[color:var(--foreground)]/10">
        <table className="w-full text-sm">
          <caption className="sr-only">Registered passkeys</caption>
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
                    <AdminActionButton
                      action={async () => {
                        "use server";
                        return adminAction(async () => {
                          await deletePasskey(r.credential_id);
                          return { ok: true, message: "Passkey deleted." };
                        });
                      }}
                      disabled={count <= 2}
                      confirmMessage={`Delete passkey "${r.name}"?`}
                      pendingLabel="Deleting..."
                      className="text-xs text-red-500 hover:underline disabled:opacity-30"
                    >
                      Delete
                    </AdminActionButton>
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
