// ponytail: matches the real grid shape so Suspense swap doesn't reflow.
// The real heatmap is an SVG (53 cols x 7 rows, see contribution-grid.tsx), so
// one block with the same aspect ratio stands in for it.

export function GitHubContributionsFallback() {
  return (
    <div className="p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="h-4 w-40 animate-pulse rounded bg-[color:var(--foreground)]/10" />
        <span className="h-3 w-16 animate-pulse rounded bg-[color:var(--foreground)]/10" />
      </div>
      <div className="aspect-[527.8/67.8] w-full animate-pulse bg-[color:var(--foreground)]/5" />
    </div>
  );
}
