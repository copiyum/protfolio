import { cacheTag } from "next/cache";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { fallback } from "@/data/fallback";

type PostRow = {
  id: string; title: string; slug: string; date: string;
  summary: string; tags: string; cover: string | null; content: string;
  published: number;
};

export async function getPosts() {
  "use cache";
  cacheTag("posts");
  try {
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as unknown as { DB: D1Database }).DB;
    const rows = await db.prepare("SELECT * FROM posts WHERE published = 1 ORDER BY date DESC").all<PostRow>();
    return rows.results.map((r) => ({
      ...r,
      tags: JSON.parse(r.tags) as string[],
      content: JSON.parse(r.content) as string[],
    }));
  } catch (e) {
    console.warn("[getPosts] D1 read failed, falling back", e);
    return fallback.posts;
  }
}

type ProjectRow = {
  id: string; title: string; period_start: string; period_end: string | null;
  link: string | null; logo: string | null; description: string | null;
  skills: string; featured: number; is_expanded: number;
  sort_order: number; published: number;
};

export async function getProjects() {
  "use cache";
  cacheTag("projects");
  try {
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as unknown as { DB: D1Database }).DB;
    const rows = await db.prepare("SELECT * FROM projects WHERE published = 1 ORDER BY sort_order").all<ProjectRow>();
    return rows.results.map((r) => ({
      id: r.id,
      title: r.title,
      period: { start: r.period_start, end: r.period_end ?? undefined },
      link: r.link ?? undefined,
      logo: r.logo ?? undefined,
      description: r.description ?? undefined,
      skills: JSON.parse(r.skills) as string[],
      featured: !!r.featured,
      isExpanded: !!r.is_expanded,
    }));
  } catch (e) {
    console.warn("[getProjects] D1 read failed, falling back", e);
    return fallback.projects;
  }
}

type SocialRow = { id: string; label: string; href: string; sort_order: number; published: number };

export async function getSocialLinks() {
  "use cache";
  cacheTag("social-links");
  try {
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as unknown as { DB: D1Database }).DB;
    const rows = await db.prepare("SELECT * FROM social_links WHERE published = 1 ORDER BY sort_order").all<SocialRow>();
    return rows.results.map((r) => ({ label: r.label, href: r.href }));
  } catch (e) {
    console.warn("[getSocialLinks] D1 read failed, falling back", e);
    return fallback.socialLinks;
  }
}

type BentoRow = {
  id: string; kind: string; label: string; value: string | null; sub: string | null;
  payload: string; col_span: number; row_span: number;
  sort_order: number; visible: number; visibility_window: string | null;
};

export async function getBentoCells() {
  "use cache";
  cacheTag("bento");
  try {
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as unknown as { DB: D1Database }).DB;
    const rows = await db.prepare("SELECT * FROM bento_cells WHERE visible = 1 ORDER BY sort_order").all<BentoRow>();
    return rows.results.map((r) => ({
      id: r.id,
      kind: r.kind as "custom" | "nowPlaying" | "github" | "map" | "typing" | "visitors" | "showcase",
      label: r.label,
      value: r.value ?? "",
      sub: r.sub ?? "",
      payload: JSON.parse(r.payload) as Record<string, unknown>,
      colSpan: r.col_span,
      rowSpan: r.row_span,
    }));
  } catch (e) {
    console.warn("[getBentoCells] D1 read failed", e);
    // Fall back to static bento cell (single cell from bento.ts) so the layout renders.
    const { bentoCustomCell } = await import("@/data/bento");
    return [{ ...bentoCustomCell, id: "custom-default", kind: "custom" as const, payload: {}, colSpan: 1, rowSpan: 1 }];
  }
}