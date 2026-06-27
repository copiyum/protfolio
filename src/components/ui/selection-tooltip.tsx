"use client";
import { useEffect, useRef } from "react";

export default function SelectionTooltip() {
  const tipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const hide = () => {
      if (tipRef.current) tipRef.current.style.opacity = "0";
    };

    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.toString().trim().length < 5) { hide(); return; }

      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (!rect.width || !tipRef.current) return;

      const tip = tipRef.current;
      tip.style.left = `${rect.left + rect.width / 2}px`;
      tip.style.top = `${rect.top - 36 + window.scrollY}px`;
      tip.style.opacity = "1";

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(hide, 1800);
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div
      ref={tipRef}
      className="pointer-events-none absolute z-[9998] -translate-x-1/2 rounded-md border border-[color:var(--foreground)]/10 bg-[var(--page-bg)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--foreground)]/70 opacity-0 shadow-sm transition-opacity duration-200"
      aria-hidden
    >
      nice taste 👀
    </div>
  );
}
