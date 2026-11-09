import { getCloudflareContext } from "@opennextjs/cloudflare";
import { unstable_cache } from "next/cache";
import type { Post, PostSummary } from "@/data/posts";
import type { Project } from "@/data/projects";
import type { Experience } from "@/data/experience";
import type { SocialLink } from "@/data/social-links";
import type { TechItem } from "@/data/tech-stack";
import {
  bentoPlugin,
  experiencesPlugin,
  navPlugin,
  postsPlugin,
  projectsPlugin,
  socialLinksPlugin,
  techStackPlugin,
  type BentoCell,
  type NavItem,
} from "@/lib/admin/entities";
import { readProfileSettings } from "@/lib/admin/singletons";
import {
  postStringArray,
  publishedPostFromRow,
  type PublishedPostRow,
} from "@/lib/admin/entities/posts";
import { DEFAULT_PROFILE_SETTINGS, type ProfileSettings } from "@/lib/profile-settings";
import {
  VISITOR_NOTES_TAG,
  listPublicVisitorNotes,
  type VisitorNote,
} from "@/lib/visitor-notes";

export type { BentoCell, NavItem } from "@/lib/admin/entities";

const PUBLIC_READ_REVALIDATE_SECONDS = 300;
const PUBLIC_BUILD_FALLBACK_ERROR = "PublicBuildFallback";

function isProductionBuildPhase() {
  return process.env.NEXT_PHASE === "phase-production-build" || process.env.npm_lifecycle_event === "build:next";
}

function publicBuildFallbackError() {
  const error = new Error("Public D1 reads are skipped during production build prerendering");
  error.name = PUBLIC_BUILD_FALLBACK_ERROR;
  return error;
}

function warnPublicRead(label: string, error: unknown) {
  if (error instanceof Error && error.name === PUBLIC_BUILD_FALLBACK_ERROR) return;
  console.warn(`[${label}] D1 read failed, falling back`, error);
}

async function getPublicDb(): Promise<D1Database> {
  if (isProductionBuildPhase()) throw publicBuildFallbackError();
  const ctx = await getCloudflareContext({ async: true });
  return (ctx.env as unknown as { DB: D1Database }).DB;
}

const getProfileSettingsCached = unstable_cache(
  async (): Promise<ProfileSettings> => {
    const db = await getPublicDb();
    return readProfileSettings(db);
  },
  ["public-profile-settings"],
  { tags: ["profile"], revalidate: PUBLIC_READ_REVALIDATE_SECONDS },
);

export async function getProfileSettings(): Promise<ProfileSettings> {
  try {
    return await getProfileSettingsCached();
  } catch (e) {
    warnPublicRead("getProfileSettings", e);
    return DEFAULT_PROFILE_SETTINGS;
  }
}

const getPostsCached = unstable_cache(
  async (): Promise<Post[]> => {
    const db = await getPublicDb();
    return postsPlugin.read(db);
  },
  ["public-posts"],
  { tags: [postsPlugin.tag], revalidate: PUBLIC_READ_REVALIDATE_SECONDS },
);

export async function getPosts(): Promise<Post[]> {
  try {
    const posts = await getPostsCached();
    return posts.length > 0 ? posts : postsPlugin.fallback();
  } catch (e) {
    warnPublicRead("getPosts", e);
    return postsPlugin.fallback();
  }
}

function fallbackPostSummaries(): PostSummary[] {
  return postsPlugin.fallback().map((post) => ({
    slug: post.slug,
    title: post.title,
    date: post.date,
    summary: post.summary,
    tags: post.tags,
    publishedAt: post.publishedAt,
    hasRichBody: Boolean(post.body),
  }));
}

const getPublishedPostSummariesCached = unstable_cache(
  async (): Promise<PostSummary[]> => {
    const db = await getPublicDb();
    const rows = await db.prepare(
      `SELECT slug, title, date, summary, tags, published_at, updated_at,
              CASE WHEN body IS NOT NULL AND body != '' THEN 1 ELSE 0 END AS has_rich_body
       FROM posts WHERE published = 1 ORDER BY date DESC`,
    ).all<{
      slug: string;
      title: string;
      date: string;
      summary: string;
      tags: string;
      published_at: string | null;
      updated_at: string | null;
      has_rich_body: number;
    }>();
    return (rows.results ?? []).map((row) => ({
      slug: row.slug,
      title: row.title,
      date: row.date,
      summary: row.summary,
      tags: postStringArray(row.tags),
      publishedAt: row.published_at ?? undefined,
      updatedAt: row.updated_at ?? undefined,
      hasRichBody: Boolean(row.has_rich_body),
    }));
  },
  ["public-post-summaries"],
  { tags: [postsPlugin.tag], revalidate: PUBLIC_READ_REVALIDATE_SECONDS },
);

export async function getPublishedPostSummaries(): Promise<PostSummary[]> {
  try {
    const posts = await getPublishedPostSummariesCached();
    return posts.length > 0 ? posts : fallbackPostSummaries();
  } catch (error) {
    warnPublicRead("getPublishedPostSummaries", error);
    return fallbackPostSummaries();
  }
}

function getPublishedPostBySlugCached(slug: string) {
  return unstable_cache(
    async (): Promise<Post | null> => {
      const db = await getPublicDb();
      const row = await db.prepare(
        "SELECT id, slug, title, date, summary, cover, tags, content, body, body_version, revision, published_at, cover_asset_id FROM posts WHERE published = 1 AND slug = ? LIMIT 1",
      ).bind(slug).first<PublishedPostRow>();
      if (row) return publishedPostFromRow(row);

      const anyPublished = await db.prepare("SELECT 1 AS present FROM posts WHERE published = 1 LIMIT 1").first<{ present: number }>();
      return anyPublished ? null : postsPlugin.fallback().find((post) => post.slug === slug) ?? null;
    },
    ["public-post-by-slug", slug],
    { tags: ["posts", `post:${slug}`], revalidate: PUBLIC_READ_REVALIDATE_SECONDS },
  );
}

export async function getPublishedPostBySlug(slug: string): Promise<Post | null> {
  try {
    const post = await getPublishedPostBySlugCached(slug)();
    return post ?? null;
  } catch (e) {
    warnPublicRead("getPublishedPostBySlug", e);
    return postsPlugin.fallback().find((post) => post.slug === slug) ?? null;
  }
}

export async function getPublishedPostSlugs(): Promise<string[]> {
  try {
    const db = await getPublicDb();
    const rows = await db.prepare("SELECT slug FROM posts WHERE published = 1 ORDER BY date DESC").all<{ slug: string }>();
    const slugs = (rows.results ?? []).map((row) => row.slug);
    return slugs.length > 0 ? slugs : postsPlugin.fallback().map((post) => post.slug);
  } catch (e) {
    warnPublicRead("getPublishedPostSlugs", e);
    return postsPlugin.fallback().map((post) => post.slug);
  }
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  return getPublishedPostBySlug(slug);
}

const getProjectsCached = unstable_cache(
  async (): Promise<Project[]> => {
    const db = await getPublicDb();
    return projectsPlugin.read(db);
  },
  ["public-projects"],
  { tags: [projectsPlugin.tag], revalidate: PUBLIC_READ_REVALIDATE_SECONDS },
);

export async function getProjects(): Promise<Project[]> {
  try {
    return await getProjectsCached();
  } catch (e) {
    warnPublicRead("getProjects", e);
    return projectsPlugin.fallback();
  }
}

const getExperiencesCached = unstable_cache(
  async (): Promise<Experience[]> => {
    const db = await getPublicDb();
    return experiencesPlugin.read(db);
  },
  ["public-experiences"],
  { tags: [experiencesPlugin.tag], revalidate: PUBLIC_READ_REVALIDATE_SECONDS },
);

export async function getExperiences(): Promise<Experience[]> {
  try {
    return await getExperiencesCached();
  } catch (e) {
    warnPublicRead("getExperiences", e);
    return experiencesPlugin.fallback();
  }
}

const getSocialLinksCached = unstable_cache(
  async (): Promise<SocialLink[]> => {
    const db = await getPublicDb();
    return socialLinksPlugin.read(db);
  },
  ["public-social-links"],
  { tags: [socialLinksPlugin.tag], revalidate: PUBLIC_READ_REVALIDATE_SECONDS },
);

export async function getSocialLinks(): Promise<SocialLink[]> {
  try {
    return await getSocialLinksCached();
  } catch (e) {
    warnPublicRead("getSocialLinks", e);
    return socialLinksPlugin.fallback();
  }
}

const getTechStackCached = unstable_cache(
  async (): Promise<TechItem[]> => {
    const db = await getPublicDb();
    return techStackPlugin.read(db);
  },
  ["public-tech-stack"],
  { tags: [techStackPlugin.tag], revalidate: PUBLIC_READ_REVALIDATE_SECONDS },
);

export async function getTechStack(): Promise<TechItem[]> {
  try {
    return await getTechStackCached();
  } catch (e) {
    warnPublicRead("getTechStack", e);
    return techStackPlugin.fallback();
  }
}

const getNavItemsCached = unstable_cache(
  async (): Promise<NavItem[]> => {
    const db = await getPublicDb();
    return navPlugin.read(db);
  },
  ["public-nav-items"],
  { tags: [navPlugin.tag], revalidate: PUBLIC_READ_REVALIDATE_SECONDS },
);

export async function getNavItems(): Promise<NavItem[]> {
  try {
    return await getNavItemsCached();
  } catch (e) {
    warnPublicRead("getNavItems", e);
    return navPlugin.fallback();
  }
}

const getBentoCellsCached = unstable_cache(
  async (): Promise<BentoCell[]> => {
    const db = await getPublicDb();
    return bentoPlugin.read(db);
  },
  ["public-bento-cells"],
  { tags: [bentoPlugin.tag], revalidate: PUBLIC_READ_REVALIDATE_SECONDS },
);

export async function getBentoCells(): Promise<BentoCell[]> {
  try {
    return await getBentoCellsCached();
  } catch (e) {
    warnPublicRead("getBentoCells", e);
    return bentoPlugin.fallback();
  }
}

const getVisitorNotesCached = unstable_cache(
  async (): Promise<VisitorNote[]> => {
    const db = await getPublicDb();
    return listPublicVisitorNotes(db);
  },
  ["public-visitor-notes"],
  { tags: [VISITOR_NOTES_TAG], revalidate: PUBLIC_READ_REVALIDATE_SECONDS },
);

export async function getVisitorNotes(): Promise<VisitorNote[]> {
  try {
    return await getVisitorNotesCached();
  } catch (e) {
    warnPublicRead("getVisitorNotes", e);
    return [];
  }
}

async function readPublicPart<T>(
  label: string,
  task: () => Promise<T>,
  fallbackValue: () => T | Promise<T>,
): Promise<T> {
  try {
    return await task();
  } catch (e) {
    warnPublicRead(`public-read:${label}`, e);
    return fallbackValue();
  }
}

export type HomePageData = {
  profile: ProfileSettings;
  bentoCells: BentoCell[];
  experiences: Experience[];
  projects: Project[];
  socialLinks: SocialLink[];
  techStack: TechItem[];
};

const getHomePageDataCached = unstable_cache(
  async (): Promise<HomePageData> => {
    const db = await getPublicDb();
    const [profile, bentoCells, experiences, projects, socialLinks, techStack] = await Promise.all([
      readPublicPart("profile", () => readProfileSettings(db), () => DEFAULT_PROFILE_SETTINGS),
      readPublicPart("bento", () => bentoPlugin.read(db), () => bentoPlugin.fallback()),
      readPublicPart("experiences", () => experiencesPlugin.read(db), () => experiencesPlugin.fallback()),
      readPublicPart("projects", () => projectsPlugin.read(db), () => projectsPlugin.fallback()),
      readPublicPart("social links", () => socialLinksPlugin.read(db), () => socialLinksPlugin.fallback()),
      readPublicPart("tech stack", () => techStackPlugin.read(db), () => techStackPlugin.fallback()),
    ]);
    return { profile, bentoCells, experiences, projects, socialLinks, techStack };
  },
  ["public-home-page-data"],
  {
    tags: ["profile", bentoPlugin.tag, experiencesPlugin.tag, projectsPlugin.tag, socialLinksPlugin.tag, techStackPlugin.tag],
    revalidate: PUBLIC_READ_REVALIDATE_SECONDS,
  },
);

export async function getHomePageData(): Promise<HomePageData> {
  try {
    return await getHomePageDataCached();
  } catch (e) {
    warnPublicRead("getHomePageData", e);
    return {
      profile: DEFAULT_PROFILE_SETTINGS,
      bentoCells: await bentoPlugin.fallback(),
      experiences: experiencesPlugin.fallback(),
      projects: projectsPlugin.fallback(),
      socialLinks: socialLinksPlugin.fallback(),
      techStack: techStackPlugin.fallback(),
    };
  }
}

export type PublicLayoutData = {
  navItems: NavItem[];
  profile: ProfileSettings;
};

const getPublicLayoutDataCached = unstable_cache(
  async (): Promise<PublicLayoutData> => {
    const db = await getPublicDb();
    const [navItems, profile] = await Promise.all([
      readPublicPart("nav", () => navPlugin.read(db), () => navPlugin.fallback()),
      readPublicPart("profile", () => readProfileSettings(db), () => DEFAULT_PROFILE_SETTINGS),
    ]);
    return { navItems, profile };
  },
  ["public-layout-data"],
  { tags: [navPlugin.tag, "profile"], revalidate: PUBLIC_READ_REVALIDATE_SECONDS },
);

export async function getPublicLayoutData(): Promise<PublicLayoutData> {
  try {
    return await getPublicLayoutDataCached();
  } catch (e) {
    warnPublicRead("getPublicLayoutData", e);
    return { navItems: navPlugin.fallback(), profile: DEFAULT_PROFILE_SETTINGS };
  }
}
