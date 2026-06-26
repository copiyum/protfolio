import Link from "next/link";
import { projects } from "@/data/projects";
import ProjectItem from "./project-item";

export default function FeaturedProjects() {
  const featured = projects.filter((p) => p.featured);

  return (
    <div>
      <ul className="divide-y divide-[color:var(--foreground)]/10">
        {featured.map((p) => (
          <li key={p.id}>
            <ProjectItem project={p} />
          </li>
        ))}
      </ul>
      <div className="border-t border-[color:var(--foreground)]/10 px-4 py-3 text-sm">
        <Link href="/projects" className="text-[color:var(--foreground)]/60 transition-colors hover:text-[color:var(--accent)]">
          More projects →
        </Link>
      </div>
    </div>
  );
}
