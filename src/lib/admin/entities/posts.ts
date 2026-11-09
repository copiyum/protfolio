import { posts as fallbackPosts, type Post } from "@/data/posts";
import { parseArticleDocument } from "@/lib/blog/normalize";
import { PostInput, type PostInput as PostInputType } from "../schema/posts";
import type { EntityPlugin } from "./types";

export type PublishedPostRow = {
  id: string;
  slug: string;
  title: string;
  date: string;
  summary: string;
  cover: string | null;
  tags: string;
  content: string;
  body: string | null;
  body_version: number | null;
  revision: number | null;
  published_at: string | null;
  cover_asset_id: string | null;
};

export function postStringArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function publishedPostFromRow(row: PublishedPostRow): Post {
  const content = postStringArray(row.content);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    date: row.date,
    summary: row.summary,
    cover: row.cover ?? undefined,
    tags: postStringArray(row.tags),
    content,
    body: row.body ? parseArticleDocument(row.body, content) : undefined,
    bodyVersion: row.body_version ?? undefined,
    revision: row.revision ?? undefined,
    publishedAt: row.published_at ?? undefined,
    coverAssetId: row.cover_asset_id ?? undefined,
  };
}

export const postsPlugin = {
  slug: "posts",
  label: "Posts",
  tag: "posts",
  schema: PostInput,
  db: {
    table: "posts",
    columns: ["id", "title", "slug", "date", "summary", "tags", "cover", "content", "published"],
    jsonColumns: ["tags", "content"],
    booleanColumns: ["published"],
    orderBy: "date DESC",
  },
  fallback: () => fallbackPosts,
  async read(db) {
    const rows = await db
      .prepare("SELECT id, slug, title, date, summary, cover, tags, content, body, body_version, revision, published_at, cover_asset_id FROM posts WHERE published = 1 ORDER BY date DESC")
      .all<PublishedPostRow>();
    return rows.results.map(publishedPostFromRow);
  },
  admin: {
    columns: [
      { key: "title", label: "Title" },
      { key: "slug", label: "Slug" },
      { key: "date", label: "Date" },
    ],
  },
} satisfies EntityPlugin<Post, PostInputType>;
