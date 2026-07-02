import { ConditionalSidebar } from "@/components/admin/ConditionalSidebar";

// Admin pages are auth-gated at runtime — never pre-render at build.
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    // `.dark` scopes the dark CSS variables (--background, --foreground, etc.)
    // to the admin subtree only — public pages still respect next-themes.
    <div className="dark flex min-h-screen bg-[color:var(--background)] text-[color:var(--foreground)]">
      <ConditionalSidebar />
      <main className="flex-1 overflow-x-hidden p-6 md:p-10">{children}</main>
    </div>
  );
}