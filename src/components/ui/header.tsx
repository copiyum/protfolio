"use client";
import type { MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/admin/read";

import { ThemeToggleButton } from "./theme-toggle";

export default function Header({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  function handleHomeClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    if (pathname !== "/") return;

    event.preventDefault();
    const behavior: ScrollBehavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";
    window.scrollTo({ top: 0, behavior });
  }

  return (
    <header className="absolute top-0 z-40 w-full backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-xl px-6 h-[3.75rem] pt-1 flex items-center justify-between">
        <Link
          href="/"
          scroll
          onClick={handleHomeClick}
          className="font-semibold tracking-tight text-xl md:text-2xl lg:text-3xl"
        >
          Sarang
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-5 text-base md:text-base">
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className="nav-link opacity-80 hover:opacity-100"
            >
              {item.label}
            </Link>
          ))}
          <ThemeToggleButton className="size-10 p-2 bg-transparent" />
        </nav>
      </div>
    </header>
  );
}
