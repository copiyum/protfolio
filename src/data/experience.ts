export interface ExperiencePosition {
  id: string;
  title: string;
  /** "MM.YYYY" or "YYYY". Omit `end` for current roles. */
  employmentPeriod: { start: string; end?: string };
  employmentType?: string;
  /** Optional icon image under /public, shown in the timeline node. */
  iconImage?: string;
  description?: string;
  skills?: string[];
  isExpanded?: boolean;
}

export interface Experience {
  id: string;
  companyName: string;
  /** Optional logo under /public. Falls back to a dot. */
  companyLogo?: string;
  companyWebsite?: string;
  isCurrentEmployer?: boolean;
  positions: ExperiencePosition[];
}

// TODO(sarang): replace placeholder copy with your real history.
export const experiences: Experience[] = [
  {
    id: "meesho",
    companyName: "Meesho",
    companyLogo: "/assets/meesho.webp",
    companyWebsite: "https://www.meesho.com",
    isCurrentEmployer: true,
    positions: [
      {
        id: "meesho-swe",
        title: "Software Developer",
        employmentPeriod: { start: "01.2026" },
        employmentType: "Full-time",
        description: "Building product surfaces and internal tooling.",
        skills: ["TypeScript", "React", "Node.js"],
        isExpanded: true,
      },
    ],
  },
];
