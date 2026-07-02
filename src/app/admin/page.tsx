import { logout } from "@/lib/admin/actions/auth";
import { listFlags } from "@/lib/admin/actions/feature-flags";

export default async function AdminDashboard() {
  const flags = await listFlags().catch(() => []);
  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <form action={logout}>
          <button className="rounded border border-[color:var(--foreground)]/20 px-3 py-1 text-sm">
            Log out
          </button>
        </form>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded border border-[color:var(--foreground)]/10 p-4">
          <h2 className="text-xs uppercase tracking-wider text-[color:var(--foreground)]/60">Feature Flags</h2>
          <p className="mt-2 text-2xl font-semibold">{flags.length}</p>
        </div>
        <div className="rounded border border-[color:var(--foreground)]/10 p-4">
          <h2 className="text-xs uppercase tracking-wider text-[color:var(--foreground)]/60">Recent Writes</h2>
          <p className="mt-2 text-sm text-[color:var(--foreground)]/60">
            <a href="/admin/audit-log" className="underline">View audit log →</a>
          </p>
        </div>
        <div className="rounded border border-[color:var(--foreground)]/10 p-4">
          <h2 className="text-xs uppercase tracking-wider text-[color:var(--foreground)]/60">Passkeys</h2>
          <p className="mt-2 text-sm">
            <a href="/admin/passkeys" className="underline">Manage →</a>
          </p>
        </div>
      </div>
    </div>
  );
}