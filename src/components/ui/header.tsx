"use client";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "@heroicons/react/24/outline";

export default function Header() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = (mounted ? resolvedTheme : theme) === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");

    // chanhdai's exact "click-soft" toggle sound
    try {
      const audio = new Audio("/assets/sounds/click-soft.mp3");
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch {}
  };

  return (
    <header className="absolute top-0 z-40 w-full backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-xl px-6 h-[3.75rem] pt-1 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight text-xl md:text-2xl lg:text-3xl">Sarang</Link>
        <nav className="flex items-center gap-5 text-base md:text-base">
          <Link href="/blog" className="nav-link opacity-80 hover:opacity-100">blog</Link>
          <Link href="/projects" className="nav-link opacity-80 hover:opacity-100">projects</Link>
          <Link href="/visitors" className="nav-link opacity-80 hover:opacity-100">visitors</Link>
          <button
            aria-label="Toggle theme"
            onClick={toggleTheme}
            className="p-2 rounded-full relative z-20 group outline-none focus-visible:ring-1 ring-neutral-950 dark:ring-neutral-50"
          >
            {/* both icons stacked; cross-rotate/fade between them = morph */}
            <span className="relative block h-6 w-6 group-active:scale-90 transition-transform duration-[140ms] ease-[cubic-bezier(.76,0,.24,1)]">
              {mounted && (
                <>
                  <SunIcon
                    className={`absolute inset-0 h-6 w-6 text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-950 dark:group-hover:text-neutral-50 transition-all duration-300 ease-[cubic-bezier(.76,0,.24,1)] group-hover:[filter:drop-shadow(0px_0px_4px_rgba(250,250,250,0.9))] ${isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"}`}
                  />
                  <MoonIcon
                    className={`absolute inset-0 h-6 w-6 text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-950 dark:group-hover:text-neutral-50 transition-all duration-300 ease-[cubic-bezier(.76,0,.24,1)] group-hover:[filter:drop-shadow(0px_0px_4px_rgba(10,10,10,0.5))] ${isDark ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100"}`}
                  />
                </>
              )}
            </span>
          </button>
        </nav>
      </div>
    </header>
  );
}
