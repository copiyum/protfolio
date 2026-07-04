import { experiences as fallbackExperiences, type Experience } from "@/data/experience";
import { ExperienceInput, type ExperienceInput as ExperienceInputType } from "../schema/experiences";
import type { EntityPlugin } from "./types";

type ExperienceRow = {
  id: string;
  company: string;
  company_logo: string | null;
  company_website: string | null;
  is_current_employer: number;
  role: string;
  employment_type: string | null;
  period_start: string;
  period_end: string | null;
  icon: string | null;
  description: string | null;
  skills: string;
  is_expanded: number;
};

function companyId(company: string): string {
  return company.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export const experiencesPlugin = {
  slug: "experiences",
  label: "Experience",
  tag: "experiences",
  schema: ExperienceInput,
  db: {
    table: "experiences",
    columns: [
      "id",
      "company",
      "company_logo",
      "company_website",
      "is_current_employer",
      "role",
      "employment_type",
      "period_start",
      "period_end",
      "icon",
      "description",
      "skills",
      "is_expanded",
      "sort_order",
      "published",
    ],
    jsonColumns: ["skills"],
    booleanColumns: ["is_current_employer", "is_expanded", "published"],
  },
  fallback: () => fallbackExperiences,
  async read(db) {
    const rows = await db
      .prepare(
        `SELECT id, company, company_logo, company_website, is_current_employer,
                role, employment_type, period_start, period_end, icon,
                description, skills, is_expanded
         FROM experiences
         WHERE published = 1
         ORDER BY sort_order, period_start DESC`,
      )
      .all<ExperienceRow>();
    const byCompany = new Map<string, Experience>();
    for (const row of rows.results) {
      const existing = byCompany.get(row.company);
      const experience = existing ?? {
        id: companyId(row.company),
        companyName: row.company,
        companyLogo: row.company_logo ?? undefined,
        companyWebsite: row.company_website ?? undefined,
        isCurrentEmployer: !!row.is_current_employer,
        positions: [],
      };
      experience.positions.push({
        id: row.id,
        title: row.role,
        employmentPeriod: { start: row.period_start, end: row.period_end ?? undefined },
        employmentType: row.employment_type ?? undefined,
        iconImage: row.icon ?? undefined,
        description: row.description ?? undefined,
        skills: JSON.parse(row.skills) as string[],
        isExpanded: !!row.is_expanded,
      });
      byCompany.set(row.company, experience);
    }
    return [...byCompany.values()];
  },
  admin: {
    columns: [
      { key: "company", label: "Company" },
      { key: "role", label: "Role" },
      { key: "period", label: "Period" },
    ],
  },
} satisfies EntityPlugin<Experience, ExperienceInputType>;
