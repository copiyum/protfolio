import { logout } from "@/lib/admin/actions/auth";
import { adminAction, type AdminActionResult } from "@/lib/admin/actions/result";
import { listFeatureFlags } from "@/lib/admin/queries";
import { AdminActionButton } from "@/components/admin/AdminActionButton";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminDashboard() {
  const flags = await listFeatureFlags().catch(() => []);

  async function logoutAction(): Promise<AdminActionResult> {
    "use server";
    return adminAction(async () => {
      await logout();
      return { ok: true, redirectTo: "/admin/login" };
    });
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <AdminActionButton
          action={logoutAction}
          pendingLabel="Logging out..."
          className="rounded border border-[color:var(--foreground)]/20 px-3 py-1 text-sm disabled:opacity-50"
        >
          Log out
        </AdminActionButton>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded border border-[color:var(--foreground)]/10 p-4">
          <h2 className="text-xs uppercase tracking-wider text-[color:var(--foreground)]/60">Feature Flags</h2>
          <p className="mt-2 text-2xl font-semibold">{flags.length}</p>
        </div>
        <div className="rounded border border-[color:var(--foreground)]/10 p-4">
          <h2 className="text-xs uppercase tracking-wider text-[color:var(--foreground)]/60">Recent Writes</h2>
          <p className="mt-2 text-sm text-[color:var(--foreground)]/60">
            <Link href="/admin/audit-log" className="underline">View audit log →</Link>
          </p>
        </div>
        <div className="rounded border border-[color:var(--foreground)]/10 p-4">
          <h2 className="text-xs uppercase tracking-wider text-[color:var(--foreground)]/60">Passkeys</h2>
          <p className="mt-2 text-sm">
            <Link href="/admin/passkeys" className="underline">Manage →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
