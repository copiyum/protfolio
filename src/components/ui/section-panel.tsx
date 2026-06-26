import type { ReactNode } from "react";

// #10 "notched label tab" frame: square box, label straddles the top border.
// The label sits on a --page-bg chip so it cuts the border line cleanly.
export default function SectionPanel({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`relative rounded-none border border-[color:var(--foreground)]/10 ${className}`}>
      <span className="pointer-events-none absolute -top-[7px] left-3 bg-[var(--page-bg)] px-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-[color:var(--accent)]">
        {label}
      </span>
      {children}
    </section>
  );
}
