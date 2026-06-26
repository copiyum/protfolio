"use client";
import { useEffect, useState } from "react";
import { ArrowUpIcon } from "@heroicons/react/24/outline";

export default function ScrollToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      aria-label="Scroll to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={`fixed bottom-6 right-6 z-30 grid h-10 w-10 place-items-center rounded-full border backdrop-blur
        border-[color:var(--card-border)] bg-[color:var(--background)]/60 text-[color:var(--foreground)]/70
        shadow-lg transition-all duration-[var(--dur-enter)] ease-[var(--ease-out)]
        hover:text-[color:var(--accent)] hover:border-[color:var(--accent)]/40
        ${show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`}
    >
      <ArrowUpIcon className="h-4 w-4" />
    </button>
  );
}
