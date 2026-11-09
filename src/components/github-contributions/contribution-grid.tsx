"use client";

import { useMemo, useState } from "react";
import { LEVEL_FILL, LEVEL_OPACITY } from "./lib/levels";

// SVG units per column/row. Cell:gap ≈ the old CSS grid (7.2px cells, 2px gap)
// at the desktop column width; the whole SVG scales to the container width.
const PITCH = 10;
const CELL = 7.8;

function isoDateAt(startMs: number, index: number) {
  return new Date(startMs + index * 86_400_000).toISOString().slice(0, 10);
}

// One <path> per level instead of ~365 styled <span>s: the heatmap used to be
// ~180KB of HTML + RSC payload. Props are compact strings (levels as digits,
// counts comma-separated), so the RSC payload stays ~2KB.
export default function ContributionGrid({
  start,
  levels,
  counts,
  cols,
  lead,
}: {
  start: string;
  levels: string;
  counts: string;
  cols: number;
  lead: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const width = cols * PITCH - (PITCH - CELL);
  const height = 7 * PITCH - (PITCH - CELL);
  const startMs = Date.parse(`${start}T00:00:00Z`);
  const countList = useMemo(() => counts.split(","), [counts]);

  const paths = useMemo(() => {
    const d = ["", "", "", "", ""];
    for (let i = 0; i < levels.length; i++) {
      const slot = lead + i;
      const x = Math.floor(slot / 7) * PITCH;
      const y = (slot % 7) * PITCH;
      d[Number(levels[i])] += `M${x} ${y}h${CELL}v${CELL}h-${CELL}z`;
    }
    return d;
  }, [levels, lead]);

  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const col = Math.floor(((event.clientX - rect.left) / rect.width) * (width / PITCH));
    const row = Math.floor(((event.clientY - rect.top) / rect.height) * (height / PITCH));
    const index = col * 7 + row - lead;
    setHover(row >= 0 && row < 7 && index >= 0 && index < levels.length ? index : null);
  };

  const hoverSlot = hover === null ? null : lead + hover;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="block h-auto w-full"
      role="img"
      aria-label="GitHub contribution heatmap for the past year"
      onPointerMove={onPointerMove}
      onPointerLeave={() => setHover(null)}
    >
      {paths.map((d, level) =>
        d ? <path key={level} d={d} fill={LEVEL_FILL} fillOpacity={LEVEL_OPACITY[level]} /> : null,
      )}
      {hoverSlot !== null && hover !== null && (
        // Same hover as before (cell at 80% opacity) + the per-day native tooltip.
        <rect
          key={hover}
          x={Math.floor(hoverSlot / 7) * PITCH}
          y={(hoverSlot % 7) * PITCH}
          width={CELL}
          height={CELL}
          fill="var(--page-bg)"
          fillOpacity={0.2}
        >
          <title>{`${countList[hover] ?? 0} on ${isoDateAt(startMs, hover)}`}</title>
        </rect>
      )}
    </svg>
  );
}
