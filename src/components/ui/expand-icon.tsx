export default function ExpandIcon({ open }: { open: boolean }) {
  const caret = (d: string) => (
    <path
      d={d}
      style={{
        transformBox: "fill-box",
        transformOrigin: "center",
        transition: "transform var(--motion-state) var(--ease-standard)",
        transform: open ? "rotate(180deg)" : "none",
      }}
    />
  );
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden>
      {caret("M7 10 L12 6 L17 10")}
      {caret("M7 14 L12 18 L17 14")}
    </svg>
  );
}
