"use client";
import Link from "next/link";

import { ThemeToggleButton2 } from "./theme-toggle";

export default function Header() {
  return (
    <header className="absolute top-0 z-40 w-full backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-xl px-6 h-[3.75rem] pt-1 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight text-xl md:text-2xl lg:text-3xl">Sarang</Link>
        <nav className="flex items-center gap-5 text-base md:text-base">
          <Link href="/blog" className="nav-link opacity-80 hover:opacity-100">blog</Link>
          <Link href="/projects" className="nav-link opacity-80 hover:opacity-100">projects</Link>
          <Link href="/visitors" className="nav-link opacity-80 hover:opacity-100">visitors</Link>
          <ThemeToggleButton2 className="size-8 p-1.5 bg-transparent" />
        </nav>
      </div>
    </header>
  );
}