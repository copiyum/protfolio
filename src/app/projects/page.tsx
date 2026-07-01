import type { Metadata } from "next";
import AnimatedStars from "@/components/ui/animated-stars";
import SectionPanel from "@/components/ui/section-panel";
import ProjectItem from "@/components/home/project-item";
import { projects } from "@/data/projects";

export const metadata: Metadata = { title: "Projects — Sarang" };

export default function ProjectsPage() {
  return (
    <div className="relative min-h-[calc(100vh-3.5rem)]">
      <AnimatedStars />
      <div className="relative z-10 mx-auto max-w-[550px] px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-neutral-400">Things I&apos;ve built, broken, and rebuilt.</p>
        </div>

        <SectionPanel>
          <ul className="divide-y divide-[color:var(--foreground)]/10">
            {projects.map((p) => (
              <li key={p.id}>
                <ProjectItem project={p} />
              </li>
            ))}
          </ul>
        </SectionPanel>
      </div>
    </div>
  );
}
