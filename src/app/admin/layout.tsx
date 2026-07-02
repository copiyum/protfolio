import { AdminSidebar } from "@/components/admin/AdminSidebar";

// Admin pages are auth-gated at runtime — never pre-render at build.
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[color:var(--background)]">
      <AdminSidebar />
      <main className="flex-1 overflow-x-hidden p-6 md:p-10">{children}</main>
    </div>
  );
}