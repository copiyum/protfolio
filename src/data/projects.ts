export interface Project {
  id: string;
  title: string;
  /** "MM.YYYY" or "YYYY". Omit `end` for ongoing; set end === start for single-period. */
  period: { start: string; end?: string };
  link?: string;
  /** Optional logo under /public. Falls back to a box icon tile. */
  logo?: string;
  description?: string;
  skills: string[];
  isExpanded?: boolean;
  featured?: boolean;
}

// TODO(sarang): edit freely — single source for /projects + the home strip.
export const projects: Project[] = [
  {
    id: "realtime-sudoku",
    title: "Realtime Sudoku",
    period: { start: "2024", end: "2024" },
    link: "#",
    description: "A realtime, multiplayer Sudoku game.",
    skills: ["Next.js", "WebSockets", "TypeScript"],
    isExpanded: true,
    featured: true,
  },
  {
    id: "sarang-dev",
    title: "sarang.dev",
    period: { start: "2025" },
    link: "#",
    description: "This portfolio — a small playground of micro-interactions.",
    skills: ["Next.js", "Tailwind", "MapLibre"],
    featured: true,
  },
];
