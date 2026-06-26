export interface SocialLink {
  label: string;
  /** Short monospace badge shown before the label (e.g. "GH"). */
  code: string;
  href: string;
}

// TODO(sarang): confirm handles/addresses.
export const socialLinks: SocialLink[] = [
  { label: "GitHub", code: "GH", href: "https://github.com/copiyum" },
  { label: "LinkedIn", code: "in", href: "#" },
  { label: "X", code: "X", href: "#" },
  { label: "Instagram", code: "IG", href: "#" },
];
