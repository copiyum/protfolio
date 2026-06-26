"use client";
import { useState } from "react";
import Image from "next/image";
import { ChevronUpDownIcon, CubeIcon, LinkIcon } from "@heroicons/react/24/outline";
import type { Project } from "@/data/projects";

export default function ProjectItem({ project }: { project: Project }) {
  const [open, setOpen] = useState(!!project.isExpanded);
  const { start, end } = project.period;
  const isOngoing = !end;
  const isSingle = end === start;

  const toggle = () => setOpen((v) => !v);

  return (
    <div className="group/project">
      <div className="flex items-center transition-colors hover:bg-[color:var(--accent)]/[0.05]">
        {project.logo ? (
          <Image src={project.logo} alt={project.title} width={24} height={24} className="mx-4 size-6 shrink-0 grayscale transition group-hover/project:grayscale-0" aria-hidden />
        ) : (
          <span className="mx-4 flex size-6 shrink-0 items-center justify-center rounded-md border border-[color:var(--foreground)]/15 bg-[var(--page-bg)] text-[color:var(--foreground)]/55">
            <CubeIcon className="size-4" />
          </span>
        )}

        <div className="flex-1 border-l border-dashed border-[color:var(--foreground)]/15">
          <div
            role="button"
            tabIndex={0}
            aria-expanded={open}
            onClick={toggle}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggle();
              }
            }}
            className="flex w-full cursor-pointer items-center gap-2 p-4 pr-2 text-left select-none"
          >
            <div className="flex-1">
              <h3 className="mb-1 text-pretty font-medium leading-snug">{project.title}</h3>
              <dl className="text-sm text-[color:var(--foreground)]/55">
                <dd className="flex items-center gap-0.5 tabular-nums">
                  <span>{start}</span>
                  {!isSingle && (
                    <>
                      <span className="font-mono">—</span>
                      {isOngoing ? <span className="font-mono text-[1.1em] leading-none">∞</span> : <span>{end}</span>}
                    </>
                  )}
                </dd>
              </dl>
            </div>

            {project.link && (
              <a
                href={project.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                aria-label="Open project"
                className="flex size-6 shrink-0 items-center justify-center text-[color:var(--foreground)]/45 transition-colors hover:text-[color:var(--accent)]"
              >
                <LinkIcon className="size-4" />
              </a>
            )}

            <span className="shrink-0 text-[color:var(--foreground)]/40">
              <ChevronUpDownIcon className="size-4" />
            </span>
          </div>
        </div>
      </div>

      <div className={`grid transition-all duration-[var(--dur-enter)] ease-[var(--ease-out)] ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="space-y-4 border-t border-[color:var(--foreground)]/10 p-4">
            {project.description && (
              <p className="text-[13px] leading-relaxed text-[color:var(--foreground)]/70">{project.description}</p>
            )}
            {project.skills.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {project.skills.map((s) => (
                  <li key={s}>
                    <span className="inline-flex items-center rounded-md border border-[color:var(--foreground)]/10 bg-[color:var(--foreground)]/[0.04] px-1.5 py-0.5 font-mono text-xs text-[color:var(--foreground)]/60">
                      {s}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
