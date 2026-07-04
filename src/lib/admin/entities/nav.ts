import { NavItemInput, type NavItemInput as NavItemInputType } from "../schema/nav";
import type { EntityPlugin } from "./types";

export interface NavItem {
  id: string;
  label: string;
  href: string;
}

export const fallbackNav: NavItem[] = [
  { id: "blog", label: "blog", href: "/blog" },
  { id: "projects", label: "projects", href: "/projects" },
  { id: "visitors", label: "visitors", href: "/visitors" },
];

export const navPlugin = {
  slug: "nav",
  label: "Nav Items",
  tag: "nav",
  schema: NavItemInput,
  db: {
    table: "nav_items",
    columns: ["id", "label", "href", "sort_order", "visible"],
    booleanColumns: ["visible"],
  },
  fallback: () => fallbackNav,
  async read(db) {
    const rows = await db
      .prepare("SELECT id, label, href FROM nav_items WHERE visible = 1 ORDER BY sort_order")
      .all<NavItem>();
    return rows.results.length ? rows.results : fallbackNav;
  },
  admin: {
    columns: [
      { key: "label", label: "Label" },
      { key: "href", label: "Href" },
      { key: "visible", label: "Visible" },
    ],
  },
} satisfies EntityPlugin<NavItem, NavItemInputType>;
