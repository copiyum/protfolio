import { formatDuration } from "@/lib/period";

export function DateRange({
  start,
  end,
  collapseSingle = false,
  showDuration = false,
}: {
  start: string;
  end?: string;
  collapseSingle?: boolean;
  showDuration?: boolean;
}) {
  const isSingle = collapseSingle && end === start;
  const isOngoing = !end;
  const duration = showDuration ? formatDuration(start, end) : "";

  return (
    <>
      <dd className="flex items-center gap-0.5 tabular-nums">
        <span>{start}</span>
        {!isSingle && (
          <>
            <span className="font-mono">&mdash;</span>
            {isOngoing ? <span className="font-mono text-[1.1em] leading-none">&infin;</span> : <span>{end}</span>}
          </>
        )}
      </dd>
      {duration && (
        <>
          <span className="h-3.5 w-px self-center bg-[color:var(--foreground)]/15" />
          <dd className="tabular-nums">{duration}</dd>
        </>
      )}
    </>
  );
}
