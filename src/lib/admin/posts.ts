import { ArticleDocumentSchema, type ArticleDocument } from "@/lib/blog/document";
import { parseArticleDocument } from "@/lib/blog/normalize";

export type PostDraft = {
  postId: string;
  title: string;
  proposedSlug: string;
  date: string;
  summary: string;
  tags: string[];
  coverAssetId?: string;
  body: ArticleDocument;
  bodyVersion: number;
  revision: number;
  /** Draft revision last published. */
  baseRevision: number;
  published: boolean;
  publishedRevision: number;
  publishedSlug?: string;
  updatedAt: string;
};

type DraftRow = {
  post_id: string;
  title: string;
  proposed_slug: string;
  date: string;
  summary: string;
  tags: string;
  cover_asset_id: string | null;
  body: string;
  body_version: number;
  revision: number;
  base_revision: number;
  published: number | null;
  published_revision: number | null;
  published_slug: string | null;
  updated_at: string;
};

function parseTags(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function rowToPostDraft(row: DraftRow): PostDraft {
  return {
    postId: row.post_id,
    title: row.title,
    proposedSlug: row.proposed_slug,
    date: row.date,
    summary: row.summary,
    tags: parseTags(row.tags),
    coverAssetId: row.cover_asset_id ?? undefined,
    body: parseArticleDocument(row.body),
    bodyVersion: row.body_version,
    revision: row.revision,
    baseRevision: row.base_revision,
    published: Boolean(row.published),
    publishedRevision: row.published_revision ?? 0,
    publishedSlug: row.published_slug ?? undefined,
    updatedAt: row.updated_at,
  };
}

export async function getPostDraft(db: D1Database, postId: string): Promise<PostDraft | null> {
  const row = await db.prepare(
    `SELECT d.post_id, d.title, d.proposed_slug, d.date, d.summary, d.tags, d.cover_asset_id, d.body,
            d.body_version, d.revision, d.base_revision, d.updated_at,
            COALESCE(p.published, 0) AS published, COALESCE(p.revision, 0) AS published_revision,
            p.slug AS published_slug
     FROM post_drafts d LEFT JOIN posts p ON p.id = d.post_id WHERE d.post_id = ?`,
  ).bind(postId).first<DraftRow>();
  return row ? rowToPostDraft(row) : null;
}

type PostDraftListRow = {
  post_id: string;
  title: string;
  proposed_slug: string;
  date: string;
  revision: number;
  updated_at: string;
  published: number;
};

export async function listPostDrafts(
  db: D1Database,
): Promise<Array<Pick<PostDraft, "postId" | "title" | "proposedSlug" | "date" | "revision" | "updatedAt" | "published">>> {
  const result = await db.prepare(
    `SELECT d.post_id, d.title, d.proposed_slug, d.date, d.revision, d.updated_at, COALESCE(p.published, 0) AS published
     FROM post_drafts d LEFT JOIN posts p ON p.id = d.post_id ORDER BY d.updated_at DESC`,
  ).all<PostDraftListRow>();
  return (result.results ?? []).map((row) => ({
    postId: row.post_id,
    title: row.title,
    proposedSlug: row.proposed_slug,
    date: row.date,
    revision: row.revision,
    updatedAt: row.updated_at,
    published: Boolean(row.published),
  }));
}

export type BlogAsset = {
  id: string;
  postId: string;
  mimeType: string;
  byteSize: number;
  width?: number;
  height?: number;
  altText: string;
  url: string;
};

export async function listBlogAssets(db: D1Database, postId: string): Promise<BlogAsset[]> {
  const result = await db.prepare(
    "SELECT id, post_id, mime_type, byte_size, width, height, alt_text FROM blog_assets WHERE post_id = ? AND deleted_at IS NULL ORDER BY created_at DESC",
  ).bind(postId).all<{ id: string; post_id: string; mime_type: string; byte_size: number; width: number | null; height: number | null; alt_text: string }>();
  return (result.results ?? []).map((row) => ({
    id: row.id,
    postId: row.post_id,
    mimeType: row.mime_type,
    byteSize: row.byte_size,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    altText: row.alt_text,
    url: `/media/blog/${row.id}`,
  }));
}

export type PostRevisionSummary = {
  revision: number;
  createdAt: string;
};

export async function listPostRevisions(db: D1Database, postId: string): Promise<PostRevisionSummary[]> {
  const result = await db.prepare(
    "SELECT revision, created_at FROM post_revisions WHERE post_id = ? ORDER BY revision DESC LIMIT 20",
  ).bind(postId).all<{ revision: number; created_at: string }>();
  return (result.results ?? []).map((row) => ({ revision: row.revision, createdAt: row.created_at }));
}

export function documentFromSnapshot(value: unknown): ArticleDocument {
  return ArticleDocumentSchema.parse(value);
}
