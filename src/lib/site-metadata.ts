export const SITE_URL = "https://sarang.dev";
export const SITE_NAME = "Sarang";
export const SITE_DESCRIPTION =
  "Software developer focused on clean design and engaging, detail-obsessed user experiences.";

// Static card rendered by scripts/generate-og-image.ts. Routes that set their own
// `openGraph`/`twitter` replace the parent object wholesale, so they must
// re-list the image.
export const OG_IMAGE = { url: "/og.png", width: 1200, height: 630, alt: "Sarang — sarang.dev" } as const;
