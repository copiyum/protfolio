// Server component — fetched at build/ISR, cached a day. No token needed.
// ponytail: public proxy. Swap to GitHub GraphQL + a token if it ever flakes.
const USERNAME = "copiyum";

interface Day {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

// violet ramp instead of GitHub green — matches --accent
const LEVEL_BG = [
  "rgba(var(--foreground-rgb),0.07)",
  "rgba(143,145,224,0.30)",
  "rgba(143,145,224,0.50)",
  "rgba(143,145,224,0.72)",
  "rgba(143,145,224,1)",
];

async function getContributions(): Promise<{ days: Day[]; total: number } | null> {
  try {
    const res = await fetch(`https://github-contributions-api.jogruber.de/v4/${USERNAME}?y=last`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const days: Day[] = data?.contributions ?? [];
    if (!days.length) return null;
    return { days, total: data?.total?.lastYear ?? days.reduce((a, d) => a + d.count, 0) };
  } catch {
    return null;
  }
}

export default async function GithubContributions() {
  const data = await getContributions();
  if (!data) return null;

  const { days, total } = data;
  const lead = new Date(days[0].date + "T00:00:00Z").getUTCDay(); // pad first column
  const cols = Math.ceil((lead + days.length) / 7); // week columns — drives the fit

  return (
    <div className="p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-sm text-[color:var(--foreground)]/70">
          <strong className="text-[color:var(--foreground)]">{total}</strong> contributions in the last year
        </span>
        <a href={`https://github.com/${USERNAME}`} target="_blank" rel="noreferrer" className="text-xs text-[color:var(--foreground)]/45 hover:text-[color:var(--accent)]">
          @{USERNAME}
        </a>
      </div>
      {/* Cells flex to fill the panel width (1fr columns + aspect-square) — the whole
          year fits in one, no horizontal scroll. */}
      <div
        className="grid w-full gap-[2px]"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: "repeat(7, auto)",
          gridAutoFlow: "column",
        }}
      >
        {Array.from({ length: lead }).map((_, i) => (
          <span key={`pad-${i}`} className="aspect-square w-full" />
        ))}
        {days.map((d) => (
          <span
            key={d.date}
            title={`${d.count} on ${d.date}`}
            className="aspect-square w-full rounded-[2px]"
            style={{ backgroundColor: LEVEL_BG[d.level] }}
          />
        ))}
      </div>
    </div>
  );
}
