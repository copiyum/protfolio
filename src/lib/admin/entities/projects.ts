import { projects as fallbackProjects, type Project } from "@/data/projects";
import { ProjectInput, type ProjectInput as ProjectInputType } from "../schema/projects";
import type { EntityPlugin } from "./types";

type ProjectRow = {
  id: string;
  title: string;
  period_start: string;
  period_end: string | null;
  link: string | null;
  logo: string | null;
  description: string | null;
  skills: string;
  featured: number;
  is_expanded: number;
};

export const projectsPlugin = {
  slug: "projects",
  label: "Projects",
  tag: "projects",
  schema: ProjectInput,
  db: {
    table: "projects",
    columns: [
      "id",
      "title",
      "period_start",
      "period_end",
      "link",
      "logo",
      "description",
      "skills",
      "featured",
      "is_expanded",
      "sort_order",
      "published",
    ],
    jsonColumns: ["skills"],
    booleanColumns: ["featured", "is_expanded", "published"],
  },
  fallback: () => fallbackProjects,
  async read(db) {
    const rows = await db
      .prepare(
        `SELECT id, title, period_start, period_end, link, logo, description, skills, featured, is_expanded
         FROM projects
         WHERE published = 1
         ORDER BY sort_order`,
      )
      .all<ProjectRow>();
    return rows.results.map((row) => ({
      id: row.id,
      title: row.title,
      period: { start: row.period_start, end: row.period_end ?? undefined },
      link: row.link ?? undefined,
      logo: row.logo ?? undefined,
      description: row.description ?? undefined,
      skills: JSON.parse(row.skills) as string[],
      featured: !!row.featured,
      isExpanded: !!row.is_expanded,
    }));
  },
  admin: {
    columns: [
      { key: "title", label: "Title" },
      { key: "period", label: "Period" },
    ],
  },
} satisfies EntityPlugin<Project, ProjectInputType>;
