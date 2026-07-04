import { techStack as fallbackTechStack, type TechItem } from "@/data/tech-stack";
import { TechInput, type TechInput as TechInputType } from "../schema/tech-stack";
import type { EntityPlugin } from "./types";

type TechRow = {
  name: string;
  icon: string | null;
  color: string;
};

export const techStackPlugin = {
  slug: "tech-stack",
  label: "Tech Stack",
  tag: "tech-stack",
  schema: TechInput,
  db: {
    table: "tech_stack",
    columns: ["id", "name", "icon", "color", "category", "sort_order", "published"],
    booleanColumns: ["published"],
  },
  fallback: () => fallbackTechStack,
  async read(db) {
    const rows = await db
      .prepare("SELECT name, icon, color FROM tech_stack WHERE published = 1 ORDER BY sort_order")
      .all<TechRow>();
    return rows.results.map((row) => ({
      name: row.name,
      color: row.color,
      svgContent: row.icon ?? "",
    }));
  },
  admin: {
    columns: [
      { key: "name", label: "Name" },
      { key: "color", label: "Color" },
      { key: "category", label: "Category" },
    ],
  },
} satisfies EntityPlugin<TechItem, TechInputType>;
