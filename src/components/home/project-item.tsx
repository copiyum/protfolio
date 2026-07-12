"use client";
import { useId, useState } from "react";
import Image from "next/image";
import { CubeIcon, LinkIcon } from "@heroicons/react/24/outline";
import type { Project } from "@/data/projects";
import ExpandIcon from "@/components/ui/expand-icon";
import { DateRange } from "./DateRange";
import { SkillTags } from "./SkillTags";

export default function ProjectItem({ project }: { project: Project }) {
  const [open, setOpen] = useState(!!project.isExpanded);
  const { start, end } = project.period;
  const hasBody = !!project.description || project.skills.length > 0;
  const detailsId = useId();

  const toggle = () => { if (hasBody) setOpen((v) => !v); };

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
          <div className="flex items-center gap-2 p-2 pl-4">
            {hasBody ? <button
              type="button"
              aria-expanded={open}
              aria-controls={detailsId}
              onClick={toggle}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-2 text-left select-none"
            >
              <div className="flex-1">
                <h3 className="mb-1 text-pretty font-medium leading-snug">{project.title}</h3>
                <dl className="text-sm text-[color:var(--foreground)]/55">
                  <DateRange start={start} end={end} collapseSingle />
                </dl>
              </div>
              <span className="shrink-0 text-[color:var(--foreground)]/40">
                <ExpandIcon open={open} />
              </span>
            </button> : <div className="min-w-0 flex-1 py-2">
              <div className="flex-1">
                <h3 className="mb-1 text-pretty font-medium leading-snug">{project.title}</h3>
              <dl className="text-sm text-[color:var(--foreground)]/55">
                <DateRange start={start} end={end} collapseSingle />
              </dl>
              </div>
            </div>}

            {project.link && (
              <a
                href={project.link}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${project.title}`}
                className="flex size-8 shrink-0 items-center justify-center text-[color:var(--foreground)]/45 transition-colors hover:text-[color:var(--accent)]"
              >
                <LinkIcon className="size-4" />
              </a>
            )}

          </div>
        </div>
      </div>

      <div id={detailsId} className={`grid transition-[grid-template-rows] duration-[var(--motion-panel)] ease-[var(--ease-standard)] ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="space-y-4 border-t border-[color:var(--foreground)]/10 p-4">
            {project.description && (
              <p className="text-[13px] leading-relaxed text-[color:var(--foreground)]/70">{project.description}</p>
            )}
            <SkillTags skills={project.skills} />
          </div>
        </div>
      </div>
    </div>
  );
}
