import Link from "next/link";
import type { Project } from "@/data/projects";
import ProjectItem from "./project-item";

export default function FeaturedProjects({ projects }: { projects: Project[] }) {
  const featured = projects.filter((p) => p.featured);

  return (
    <div>
      {featured.length === 0 ? (
        <p className="px-4 py-5 text-sm text-[color:var(--foreground)]/50">No featured projects yet.</p>
      ) : (
        <ul className="divide-y divide-[color:var(--foreground)]/10">
          {featured.map((p) => (
            <li key={p.id}>
              <ProjectItem project={p} />
            </li>
          ))}
        </ul>
      )}
      <div className="border-t border-[color:var(--foreground)]/10 px-4 py-3 text-sm">
        <Link href="/projects" className="text-[color:var(--foreground)]/60 transition-colors hover:text-[color:var(--accent)]">
          More projects →
        </Link>
      </div>
    </div>
  );
}
