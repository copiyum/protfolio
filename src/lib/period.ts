// Employment/project period helpers. Accepts "MM.YYYY" or "YYYY".
function toMonths(str: string, edge: "start" | "end"): number {
  if (str.includes(".")) {
    const [mm, yy] = str.split(".");
    return Number(yy) * 12 + (Number(mm) - 1);
  }
  return Number(str) * 12 + (edge === "end" ? 11 : 0);
}

function nowMonths(): number {
  const d = new Date();
  return d.getFullYear() * 12 + d.getMonth();
}

/** "6m", "2y", "2y 6m", or "" when the span is zero/negative. */
export function formatDuration(start: string, end?: string): string {
  const s = toMonths(start, "start");
  const e = end ? toMonths(end, "end") : nowMonths();
  const total = e - s + 1;
  if (total <= 0) return "";
  if (total < 12) return `${total}m`;
  const years = Math.floor(total / 12);
  const months = total % 12;
  return months === 0 ? `${years}y` : `${years}y ${months}m`;
}
