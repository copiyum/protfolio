// ponytail: matches the real grid shape so Suspense swap doesn't reflow.

export function GitHubContributionsFallback() {
  // 53 weeks × 7 days ≈ 371 cells, sized like the real grid.
  const cols = 53;
  return (
    <div className="p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="h-4 w-40 animate-pulse rounded bg-[color:var(--foreground)]/10" />
        <span className="h-3 w-16 animate-pulse rounded bg-[color:var(--foreground)]/10" />
      </div>
      <div
        className="grid w-full gap-[2px]"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: "repeat(7, auto)",
          gridAutoFlow: "column",
        }}
      >
        {Array.from({ length: cols * 7 }).map((_, i) => (
          <span
            key={i}
            className="aspect-square w-full animate-pulse bg-[color:var(--foreground)]/5"
          />
        ))}
      </div>
    </div>
  );
}