import { type ContributionsData, getMonthLabels } from "./lib/get-cached-contributions";

// violet ramp — matches --accent, not GitHub green
// ponytail: opacity multipliers over one color give a smoother, more visible ramp
// than mixing foreground-white + violet at low alphas (which washes out on dark bg).
const LEVEL_BG = "rgb(143,145,224)";
const LEVEL_OPACITY = [0.06, 0.32, 0.55, 0.78, 1] as const;

export function GitHubContributions({
  contributions,
  githubProfileUrl,
}: {
  contributions: Promise<ContributionsData | null>;
  githubProfileUrl: string;
}) {
  return <GitHubContributionsInner contributions={contributions} githubProfileUrl={githubProfileUrl} />;
}

async function GitHubContributionsInner({
  contributions,
  githubProfileUrl,
}: {
  contributions: Promise<ContributionsData | null>;
  githubProfileUrl: string;
}) {
  const data = await contributions;
  if (!data) return null;

  const { days, total } = data;
  const lead = new Date(days[0].date + "T00:00:00Z").getUTCDay();
  const cols = Math.ceil((lead + days.length) / 7);
  const monthLabels = getMonthLabels(days);

  return (
    <div className="p-4">
      {/* Month axis — absolute-positioned labels over their starting column. */}
      <div className="relative mb-2 h-4 w-full">
        {monthLabels.map(({ col, label }) => (
          <span
            key={`${col}-${label}`}
            className="absolute text-[10px] font-medium tracking-wide text-[color:var(--foreground)]/60"
            style={{ left: `calc(${(col / cols) * 100}% + 1px)` }}
          >
            {label}
          </span>
        ))}
      </div>

      <div
        className="grid w-full gap-[2px]"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridAutoFlow: "column",
          gridTemplateRows: "repeat(7, auto)",
        }}
      >
        {Array.from({ length: lead }).map((_, i) => (
          <span key={`pad-${i}`} className="aspect-square w-full" />
        ))}
        {days.map((d) => (
          <span
            key={d.date}
            title={`${d.count} on ${d.date}`}
            className="aspect-square w-full transition-opacity hover:opacity-80"
            style={{ backgroundColor: LEVEL_BG, opacity: LEVEL_OPACITY[d.level] }}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[color:var(--foreground)]/60">
        <span>
          <strong className="text-[color:var(--foreground)]">
            {total.toLocaleString()}
          </strong>{" "}
          contributions in the past 365 days
        </span>
        <span className="flex items-center gap-2">
          Less
          {LEVEL_OPACITY.map((o, i) => (
            <span
              key={i}
              className="size-[10px]"
              style={{ backgroundColor: LEVEL_BG, opacity: o }}
            />
          ))}
          More
        </span>
      </div>

      <a
        href={githubProfileUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-2 flex items-center gap-2 text-xs text-[color:var(--foreground)]/40 hover:text-[color:var(--accent)]"
      >
        <img
          src={`https://github.com/${githubProfileUrl.split("/").pop()}.png?size=80`}
          alt=""
          width={20}
          height={20}
          className="rounded-full"
        />
        @{githubProfileUrl.split("/").pop()}
      </a>
    </div>
  );
}