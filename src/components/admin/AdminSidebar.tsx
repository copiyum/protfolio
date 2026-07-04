"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/profile", label: "Profile" },
  { href: "/admin/posts", label: "Posts" },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/experiences", label: "Experience" },
  { href: "/admin/social-links", label: "Social Links" },
  { href: "/admin/tech-stack", label: "Tech Stack" },
  { href: "/admin/bento", label: "Bento" },
  { href: "/admin/feature-flags", label: "Flags" },
  { href: "/admin/nav", label: "Nav" },
  { href: "/admin/seo", label: "SEO" },
  { href: "/admin/visitor-notes", label: "Visitor Notes" },
  { href: "/admin/passkeys", label: "Passkeys" },
  { href: "/admin/audit-log", label: "Audit Log" },
];

export function AdminSidebar() {
  const path = usePathname() ?? "";
  return (
    <nav className="w-56 shrink-0 border-r border-[color:var(--foreground)]/10 p-4">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[color:var(--foreground)]/60">
        Admin
      </h2>
      <ul className="space-y-1">
        {items.map((i) => {
          const active = i.href === "/admin" ? path === "/admin" : path.startsWith(i.href);
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                className={`block rounded px-2 py-1 text-sm ${
                  active
                    ? "bg-[color:var(--foreground)]/10 font-medium"
                    : "hover:bg-[color:var(--foreground)]/5"
                }`}
              >
                {i.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
