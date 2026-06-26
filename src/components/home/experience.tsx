"use client";
import { useState } from "react";
import Image from "next/image";
import { CodeBracketIcon } from "@heroicons/react/24/outline";
import { experiences, type Experience as ExperienceType, type ExperiencePosition } from "@/data/experience";
import { formatDuration } from "@/lib/period";

// Double chevron whose arrows flip direction on open/close (chanhdai's cue):
// collapsed = pointing outward (⌃⌄), open = pointing inward (⌄⌃). Each caret
// rotates 180° about its own center.
function ExpandIcon({ open }: { open: boolean }) {
  const caret = (d: string) => (
    <path
      d={d}
      style={{
        transformBox: "fill-box",
        transformOrigin: "center",
        transition: "transform .2s ease",
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

export default function Experience() {
  return (
    <div className="px-4 text-[color:var(--foreground)]">
      {experiences.map((exp) => (
        <ExperienceItem key={exp.id} experience={exp} />
      ))}
    </div>
  );
}

function ExperienceItem({ experience }: { experience: ExperienceType }) {
  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center gap-3">
        <div className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-md">
          {experience.companyLogo ? (
            // `unoptimized`: serve the pristine webp (no re-compression) so it stays crisp.
            // The asset has ~20% transparent padding per side; scale to crop it in CSS.
            <Image src={experience.companyLogo} alt={experience.companyName} width={48} height={48} unoptimized className="size-6 scale-[1.5]" aria-hidden />
          ) : (
            <span className="flex size-2 rounded-full bg-[color:var(--foreground)]/30" />
          )}
        </div>

        <h3 className="text-lg font-semibold leading-snug">
          {experience.companyWebsite ? (
            <a
              href={experience.companyWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-4 transition-colors hover:text-[color:var(--accent)] hover:underline"
            >
              {experience.companyName}
            </a>
          ) : (
            experience.companyName
          )}
        </h3>

        {experience.isCurrentEmployer && (
          <span className="relative flex items-center justify-center" aria-label="Current employer">
            <span className="absolute inline-flex size-3 animate-ping rounded-full bg-[color:var(--accent)] opacity-50" />
            <span className="relative inline-flex size-2 rounded-full bg-[color:var(--accent)]" />
          </span>
        )}
      </div>

      <div className="relative space-y-4">
        {experience.positions.map((p) => (
          <PositionItem key={p.id} position={p} />
        ))}
      </div>
    </div>
  );
}

function PositionItem({ position }: { position: ExperiencePosition }) {
  const [open, setOpen] = useState(!!position.isExpanded);
  const { start, end } = position.employmentPeriod;
  const isOngoing = !end;
  const duration = formatDuration(start, end);
  const hasBody = !!position.description;

  return (
    <div className="relative">
      {/* One-piece L connector: a left border (the rail) curving via rounded-bl into
          a short bottom border toward the content. Starts behind the icon (top-5,
          hidden by its opaque chip) and ends at the skills row — can't gap or overshoot. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-3 top-5 bottom-[9px] w-4 rounded-bl-md border-b border-l border-[color:var(--foreground)]/20"
      />
      <button
        type="button"
        disabled={!hasBody}
        aria-expanded={open}
        onClick={() => hasBody && setOpen((v) => !v)}
        className="group relative block w-full select-none text-left before:absolute before:-top-1 before:-right-1 before:-bottom-1.5 before:left-7 before:rounded-lg before:transition-colors enabled:hover:before:bg-[color:var(--foreground)]/[0.05] disabled:cursor-default"
      >
        <div className="relative z-[1] mb-1 flex items-start gap-3 text-base">
          <span className="relative z-[1] flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[color:var(--foreground)]/15 bg-[var(--page-bg)] text-[color:var(--foreground)]/55">
            {position.iconImage ? (
              <Image src={position.iconImage} alt="" width={16} height={16} className="size-4 object-contain" aria-hidden />
            ) : (
              <CodeBracketIcon className="size-3.5" />
            )}
          </span>

          <h4 className="flex-1 text-pretty font-medium text-[color:var(--foreground)]">{position.title}</h4>

          {hasBody && (
            <span className="shrink-0 text-[color:var(--foreground)]/40">
              <ExpandIcon open={open} />
            </span>
          )}
        </div>

        <dl
          className="relative z-[1] flex items-center gap-2 pl-9 text-sm text-[color:var(--foreground)]/55"
          suppressHydrationWarning
        >
          {position.employmentType && (
            <>
              <dd>{position.employmentType}</dd>
              <span className="h-3.5 w-px self-center bg-[color:var(--foreground)]/15" />
            </>
          )}
          <dd className="flex items-center gap-0.5 tabular-nums">
            <span>{start}</span>
            <span className="font-mono">—</span>
            {isOngoing ? <span className="font-mono text-[1.1em] leading-none">∞</span> : <span>{end}</span>}
          </dd>
          {duration && (
            <>
              <span className="h-3.5 w-px self-center bg-[color:var(--foreground)]/15" />
              <dd className="tabular-nums">{duration}</dd>
            </>
          )}
        </dl>
      </button>

      {hasBody && (
        <div className={`grid transition-all duration-[var(--dur-enter)] ease-[var(--ease-out)] ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
          <div className="overflow-hidden">
            <p className="pt-2 pl-9 text-[13px] leading-relaxed text-[color:var(--foreground)]/65">{position.description}</p>
          </div>
        </div>
      )}

      {position.skills && position.skills.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 pt-3 pl-9">
          {position.skills.map((s) => (
            <li key={s}>
              <span className="inline-flex items-center rounded-md border border-[color:var(--foreground)]/10 bg-[color:var(--foreground)]/[0.04] px-1.5 py-0.5 font-mono text-xs text-[color:var(--foreground)]/60">
                {s}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
