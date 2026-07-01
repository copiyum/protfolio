// ponytail: public proxy, no token needed. Swap to GraphQL + token if it flakes.
// Cached at request level via React.cache — same call across the tree returns the same promise.

import { cache } from "react";

export interface ContributionDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface ContributionsData {
  days: ContributionDay[];
  total: number;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// ponytail: uppercase prevents n/h confusion at small sizes —
// project's font renders "Jun" as "Juh" at 10px on some setups.
export function formatMonth(m: number): string {
  return MONTHS[m].toUpperCase();
}

export async function fetchContributions(
  username: string,
): Promise<ContributionsData | null> {
  try {
    const res = await fetch(
      `https://github-contributions-api.jogruber.de/v4/${username}?y=last`,
      { next: { revalidate: 86400 } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const days: ContributionDay[] = data?.contributions ?? [];
    if (!days.length) return null;
    const total =
      data?.total?.lastYear ?? days.reduce((a, d) => a + d.count, 0);
    return { days, total };
  } catch {
    return null;
  }
}

// Per-request cache — React.cache dedupes within a single render pass.
export const getCachedContributions = cache(
  (username: string) => fetchContributions(username),
);

// For the month axis. Returns the column index where each new month starts.
export function getMonthLabels(days: ContributionDay[]): { col: number; label: string }[] {
  if (!days.length) return [];
  const start = new Date(days[0].date + "T00:00:00Z");
  const lead = start.getUTCDay();
  const labels: { col: number; label: string }[] = [];
  let lastMonth = -1;

  days.forEach((d, i) => {
    const date = new Date(d.date + "T00:00:00Z");
    const m = date.getUTCMonth();
    if (m !== lastMonth) {
      labels.push({ col: Math.floor((lead + i) / 7), label: formatMonth(m) });
      lastMonth = m;
    }
  });

  return labels;
}