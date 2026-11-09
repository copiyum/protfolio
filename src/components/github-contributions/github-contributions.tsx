import Image from "next/image";
import ContributionGrid from "./contribution-grid";
import { LEVEL_FILL, LEVEL_OPACITY } from "./lib/levels";
import { type ContributionsData, getMonthLabels } from "./lib/get-cached-contributions";

// Self-hosted copy of github.com/<user>.png (was a 302 redirect, unoptimized).
const GITHUB_AVATAR_SRC = "/assets/github-avatar.webp";

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
  const githubUser = githubProfileUrl.split("/").pop() ?? "";
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

      <ContributionGrid
        start={days[0].date}
        levels={days.map((d) => d.level).join("")}
        counts={days.map((d) => d.count).join(",")}
        cols={cols}
        lead={lead}
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[color:var(--foreground)]/60">
        <span>
          <strong className="text-[color:var(--foreground)]">
            {total.toLocaleString("en-US")}
          </strong>{" "}
          contributions in the past 365 days
        </span>
        <span className="flex items-center gap-2">
          Less
          {LEVEL_OPACITY.map((o, i) => (
            <span
              key={i}
              className="size-[10px]"
              style={{ backgroundColor: LEVEL_FILL, opacity: o }}
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
        {/* 40x40 WebP, <1KB: served as-is, no optimizer round trip needed. */}
        <Image src={GITHUB_AVATAR_SRC} alt="" width={20} height={20} unoptimized className="rounded-full" />
        @{githubUser}
      </a>
    </div>
  );
}
