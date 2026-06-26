export interface Post {
  slug: string;
  title: string;
  /** ISO date — formatted with a pinned locale to stay hydration-safe. */
  date: string;
  summary: string;
  tags: string[];
  /** Optional cover under /public. Falls back to a gradient tile. */
  cover?: string;
  /** Body paragraphs, rendered in order on the post page. */
  content: string[];
}

// TODO(sarang): write real posts. Each becomes a card on /blog (searchable)
// and a page at /blog/[slug].
export const posts: Post[] = [
  {
    slug: "building-this-site",
    title: "Building this site",
    date: "2025-09-15",
    summary: "Notes on the map, the typing toy, and chasing micro-interactions that feel alive.",
    tags: ["Next.js", "design"],
    content: [
      "I wanted a portfolio that felt less like a résumé and more like a desk you could fidget with. So instead of a hero image and a wall of text, the home page is a series of small toys: a tilted 3D map of where I am, a typing test with a bongo cat, a drawing board for visitors.",
      "Every one of those started as an excuse to learn something. The map taught me MapLibre's style system and how expensive it is to throw away a GL context. The typing toy was an exercise in measuring WPM without lying to the user. The drawing board was about getting canvas to feel immediate.",
      "The rule I kept coming back to: if a thing animates in response to time or the pointer, it belongs in CSS or a ref-mutated style — not React state. State means re-renders, and re-renders are how a playful page turns into a janky one.",
      "None of it is essential. All of it is the point.",
    ],
  },
  {
    slug: "motion-paths",
    title: "A plane that faces where it flies",
    date: "2025-10-02",
    summary: "Using CSS Motion Path to point a sprite along its own trajectory — no JS per frame.",
    tags: ["CSS", "motion"],
    content: [
      "The little plane that loops over the map isn't driven by JavaScript. It rides a CSS Motion Path: you define an `offset-path`, animate `offset-distance` from 0% to 100%, and the browser walks the sprite along the curve for you.",
      "The detail that sells it is `offset-rotate: auto`. With that one declaration the element rotates to match the tangent of the path, so the plane's nose always points the direction it's travelling — banking through the turns for free.",
      "Because it's all declarative, it runs on the compositor. No requestAnimationFrame, no layout thrash, and it pauses politely when the user prefers reduced motion. The whole effect is a dozen lines of CSS doing what would otherwise be a per-frame trig problem.",
    ],
  },
  {
    slug: "hydration-traps",
    title: "Three hydration traps I keep hitting",
    date: "2025-11-20",
    summary: "Locale strings, theme branching, and clocks — and the cheap fixes for each.",
    tags: ["React", "Next.js"],
    content: [
      "Hydration mismatches all come from the same place: the server renders one thing, the client renders another, and React notices. Three of them get me over and over.",
      "First, locale-dependent dates. `toLocaleDateString(undefined, …)` uses the server's locale on the server and the browser's on the client. Pin the locale explicitly — `'en-US'` — and the strings agree.",
      "Second, theme branching. Reading the resolved theme during render means the server (which has no theme) and the client disagree. Gate theme-dependent output behind a mounted flag, or lean on CSS `dark:` variants so the branch never touches JS.",
      "Third, clocks. A live time renders differently every millisecond, so the server's value is always 'wrong'. Render it with `suppressHydrationWarning` and let the client correct it on mount — and tick on the minute, not the second, if all you show is HH:MM.",
    ],
  },
];
