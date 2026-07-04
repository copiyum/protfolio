import { socialLinks as fallbackSocialLinks, type SocialLink } from "@/data/social-links";
import { SocialLinkInput, type SocialLinkInput as SocialLinkInputType } from "../schema/social-links";
import type { EntityPlugin } from "./types";

type SocialRow = {
  label: string;
  href: string;
};

export const socialLinksPlugin = {
  slug: "social-links",
  label: "Social Links",
  tag: "social-links",
  schema: SocialLinkInput,
  db: {
    table: "social_links",
    columns: ["id", "label", "href", "sort_order", "published"],
    booleanColumns: ["published"],
  },
  fallback: () => fallbackSocialLinks,
  async read(db) {
    const rows = await db
      .prepare("SELECT label, href FROM social_links WHERE published = 1 ORDER BY sort_order")
      .all<SocialRow>();
    return rows.results.map((row) => ({ label: row.label, href: row.href }));
  },
  admin: {
    columns: [
      { key: "label", label: "Label" },
      { key: "href", label: "URL" },
    ],
  },
} satisfies EntityPlugin<SocialLink, SocialLinkInputType>;
