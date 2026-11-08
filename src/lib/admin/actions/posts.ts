"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { ArticleDocumentSchema, type ArticleDocument } from "@/lib/blog/document";
import { BlogPostIdSchema } from "@/lib/blog/assets";
import { documentToJson } from "@/lib/blog/normalize";
import { getPostDraft } from "@/lib/admin/posts";
import { requireActionAdmin } from "./_security";

const MetadataSchema = z.object({
  title: z.string().trim().min(1).max(200),
  proposedSlug: z.string().trim().min(1).max(200).regex(/^[a-z0-9-]+$/),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  summary: z.string().trim().max(500).default(""),
  tags: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  coverAssetId: z.string().uuid().optional(),
  body: ArticleDocumentSchema,
});

const CreateDraftSchema = MetadataSchema;
const SaveDraftSchema = MetadataSchema.extend({ postId: BlogPostIdSchema, expectedDraftRevision: z.number().int().nonnegative() });
const PublishPostSchema = z.object({ postId: BlogPostIdSchema, expectedDraftRevision: z.number().int().nonnegative() });
const UnpublishPostSchema = z.object({ postId: BlogPostIdSchema, expectedPublishedRevision: z.number().int().positive() });
const RestoreSchema = z.object({
  postId: BlogPostIdSchema,
  revision: z.number().int().positive(),
  expectedDraftRevision: z.number().int().nonnegative(),
});
const DeletePostSchema = z.object({
  postId: BlogPostIdSchema,
  expectedDraftRevision: z.number().int().nonnegative(),
});

type Metadata = z.infer<typeof MetadataSchema>;

type PublishedRow = { id: string; slug: string; revision: number; published: number };
type AssetRow = { id: string; alt_text: string };

function auditSummary(metadata: Metadata, bodyHash: string, oldRevision: number, newRevision: number) {
  return {
    bodyHash,
    oldRevision,
    newRevision,
    blockCount: metadata.body.blocks.length,
    metadata: {
      title: metadata.title,
      proposedSlug: metadata.proposedSlug,
      date: metadata.date,
      tags: metadata.tags,
      hasCover: Boolean(metadata.coverAssetId),
    },
  };
}

async function sha256(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function referencedAssetIds(document: ArticleDocument, coverAssetId?: string): string[] {
  return [...new Set([
    ...document.blocks.flatMap((block) => block.type === "image" ? [block.assetId] : []),
    ...(coverAssetId ? [coverAssetId] : []),
  ])];
}

async function validateAssets(db: D1Database, postId: string, metadata: Metadata) {
  const ids = referencedAssetIds(metadata.body, metadata.coverAssetId);
  if (ids.length === 0) return;
  const rows = await db.prepare(
    `SELECT id, alt_text FROM blog_assets WHERE post_id = ? AND deleted_at IS NULL AND id IN (${ids.map(() => "?").join(", ")})`,
  ).bind(postId, ...ids).all<AssetRow>();
  const assets = new Map((rows.results ?? []).map((row) => [row.id, row]));
  if (assets.size !== ids.length) throw new Error("One or more referenced images are missing or unavailable");
  for (const block of metadata.body.blocks) {
    if (block.type === "image" && (!block.alt.trim() || !assets.get(block.assetId)?.alt_text.trim())) {
      throw new Error("Every published image needs alt text");
    }
  }
}

function invalidatePublished(slugs: readonly string[]) {
  updateTag("posts");
  for (const slug of new Set(slugs.filter(Boolean))) updateTag(`post:${slug}`);
}

export async function createDraft(input: unknown): Promise<{ ok: true; postId: string; draftRevision: number }> {
  const admin = await requireActionAdmin({ write: true });
  const parsed = CreateDraftSchema.parse(input);
  const postId = crypto.randomUUID();
  const body = documentToJson(parsed.body);
  const bodyHash = await sha256(body);
  const audit = admin.prepareAudit({
    action: "create_post_draft",
    targetTable: "post_drafts",
    targetId: postId,
    diff: auditSummary(parsed, bodyHash, -1, 0),
  });
  await admin.db.batch([
    admin.db.prepare(
      `INSERT INTO post_drafts (post_id, title, proposed_slug, date, summary, tags, cover_asset_id, body, body_version, revision, base_revision)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0)`,
    ).bind(postId, parsed.title, parsed.proposedSlug, parsed.date, parsed.summary, JSON.stringify(parsed.tags), parsed.coverAssetId ?? null, body),
    audit.statement,
  ]);
  return { ok: true, postId, draftRevision: 0 };
}

export async function saveDraft(input: unknown): Promise<{ ok: true; draftRevision: number }> {
  const admin = await requireActionAdmin({ write: true });
  const parsed = SaveDraftSchema.parse(input);
  const body = documentToJson(parsed.body);
  const bodyHash = await sha256(body);
  const result = await admin.db.prepare(
    `UPDATE post_drafts
     SET title = ?, proposed_slug = ?, date = ?, summary = ?, tags = ?, cover_asset_id = ?, body = ?, body_version = 1,
         revision = revision + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
     WHERE post_id = ? AND revision = ?`,
  ).bind(parsed.title, parsed.proposedSlug, parsed.date, parsed.summary, JSON.stringify(parsed.tags), parsed.coverAssetId ?? null, body, parsed.postId, parsed.expectedDraftRevision).run();
  if (result.meta.changes !== 1) throw new Error("This draft changed in another tab. Reload it before saving again.");
  const revision = parsed.expectedDraftRevision + 1;
  const audit = admin.prepareAudit({
    action: "save_post_draft",
    targetTable: "post_drafts",
    targetId: parsed.postId,
    diff: auditSummary(parsed, bodyHash, parsed.expectedDraftRevision, revision),
  });
  await audit.statement.run();
  return { ok: true, draftRevision: revision };
}

export async function publishPost(input: unknown): Promise<{ ok: true; url: string; draftRevision: number; publishedRevision: number }> {
  const admin = await requireActionAdmin({ write: true, fresh: true });
  const parsed = PublishPostSchema.parse(input);
  const draft = await getPostDraft(admin.db, parsed.postId);
  if (!draft) throw new Error("Draft not found");
  if (draft.revision !== parsed.expectedDraftRevision) throw new Error("This draft changed in another tab. Reload it before publishing.");
  const metadata = MetadataSchema.parse({
    title: draft.title, proposedSlug: draft.proposedSlug, date: draft.date, summary: draft.summary,
    tags: draft.tags, coverAssetId: draft.coverAssetId, body: draft.body,
  });
  await validateAssets(admin.db, parsed.postId, metadata);
  const existingSlug = await admin.db.prepare("SELECT id FROM posts WHERE slug = ? AND id != ?").bind(metadata.proposedSlug, parsed.postId).first<{ id: string }>();
  if (existingSlug) throw new Error("That slug belongs to another post");
  const existing = await admin.db.prepare("SELECT id, slug, revision, published FROM posts WHERE id = ?").bind(parsed.postId).first<PublishedRow>();
  const revision = (existing?.revision ?? 0) + 1;
  const body = documentToJson(metadata.body);
  const bodyHash = await sha256(body);
  const snapshot = JSON.stringify({
    title: metadata.title, slug: metadata.proposedSlug, date: metadata.date, summary: metadata.summary,
    tags: metadata.tags, coverAssetId: metadata.coverAssetId ?? null, body: metadata.body, bodyVersion: 1, revision,
  });
  const audit = admin.prepareAudit({
    action: "publish_post",
    targetTable: "posts",
    targetId: parsed.postId,
    diff: auditSummary(metadata, bodyHash, existing?.revision ?? 0, revision),
  });
  try {
    await admin.db.batch([
      admin.db.prepare(
        `INSERT INTO posts (id, title, slug, date, summary, tags, cover, content, published, body, body_version, revision, published_at, cover_asset_id, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NULL, '[]', 1, ?, 1, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'), ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
         ON CONFLICT(id) DO UPDATE SET title = excluded.title, slug = excluded.slug, date = excluded.date, summary = excluded.summary,
           tags = excluded.tags, published = 1, body = excluded.body, body_version = 1, revision = excluded.revision,
           published_at = excluded.published_at, cover_asset_id = excluded.cover_asset_id, updated_at = excluded.updated_at`,
      ).bind(parsed.postId, metadata.title, metadata.proposedSlug, metadata.date, metadata.summary, JSON.stringify(metadata.tags), body, revision, metadata.coverAssetId ?? null),
      admin.db.prepare(
        `INSERT INTO post_revisions (id, post_id, revision, snapshot, body_hash, actor_credential_id)
         VALUES (?, (SELECT post_id FROM post_drafts WHERE post_id = ? AND revision = ?), ?, ?, ?, ?)`,
      ).bind(
        crypto.randomUUID(),
        parsed.postId,
        parsed.expectedDraftRevision,
        revision,
        snapshot,
        bodyHash,
        admin.credentialId,
      ),
      admin.db.prepare(
        `UPDATE post_drafts SET base_revision = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
         WHERE post_id = ? AND revision = ?`,
      ).bind(draft.revision, parsed.postId, parsed.expectedDraftRevision),
      audit.statement,
    ]);
  } catch (error) {
    if (error instanceof Error && /post_revisions\.post_id/i.test(error.message)) {
      throw new Error("This draft changed in another tab. Reload it before publishing.");
    }
    throw error;
  }
  invalidatePublished([existing?.slug ?? "", metadata.proposedSlug]);
  return {
    ok: true,
    url: `/blog/${metadata.proposedSlug}`,
    draftRevision: draft.revision,
    publishedRevision: revision,
  };
}

export async function unpublishPost(input: unknown): Promise<{ ok: true }> {
  const admin = await requireActionAdmin({ write: true, fresh: true });
  const parsed = UnpublishPostSchema.parse(input);
  const post = await admin.db.prepare(
    "SELECT id, slug, revision, published FROM posts WHERE id = ? AND published = 1",
  ).bind(parsed.postId).first<PublishedRow>();
  if (!post) throw new Error("Published post not found");
  if (post.revision !== parsed.expectedPublishedRevision) throw new Error("This post has changed. Reload before unpublishing.");
  const audit = admin.prepareAudit({ action: "unpublish_post", targetTable: "posts", targetId: parsed.postId, diff: { revision: post.revision } });
  await admin.db.batch([
    admin.db.prepare("UPDATE posts SET published = 0, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?").bind(parsed.postId),
    audit.statement,
  ]);
  invalidatePublished([post.slug]);
  return { ok: true };
}

export async function restoreRevision(input: unknown): Promise<{ ok: true; draftRevision: number }> {
  const admin = await requireActionAdmin({ write: true, fresh: true });
  const parsed = RestoreSchema.parse(input);
  const row = await admin.db.prepare(
    "SELECT snapshot FROM post_revisions WHERE post_id = ? AND revision = ?",
  ).bind(parsed.postId, parsed.revision).first<{ snapshot: string }>();
  if (!row) throw new Error("Revision not found");
  let snapshot: { title: string; slug: string; date: string; summary: string; tags: string[]; coverAssetId?: string | null; body: ArticleDocument };
  try { snapshot = JSON.parse(row.snapshot) as typeof snapshot; } catch { throw new Error("Stored revision is invalid"); }
  const metadata = MetadataSchema.parse({
    ...snapshot,
    coverAssetId: snapshot.coverAssetId ?? undefined,
    proposedSlug: snapshot.slug,
  });
  const body = documentToJson(metadata.body);
  const current = await getPostDraft(admin.db, parsed.postId);
  if (!current) throw new Error("Draft not found");
  if (current.revision !== parsed.expectedDraftRevision) {
    throw new Error("This draft changed in another tab. Reload it before restoring a revision.");
  }
  const nextRevision = current.revision + 1;
  const audit = admin.prepareAudit({
    action: "restore_post_revision", targetTable: "post_drafts", targetId: parsed.postId,
    diff: { restoredRevision: parsed.revision, newDraftRevision: nextRevision, bodyHash: await sha256(body) },
  });
  const result = await admin.db.prepare(
    `UPDATE post_drafts
     SET title = ?, proposed_slug = ?, date = ?, summary = ?, tags = ?, cover_asset_id = ?, body = ?,
         body_version = 1, revision = revision + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
     WHERE post_id = ? AND revision = ?`,
  ).bind(
    metadata.title,
    metadata.proposedSlug,
    metadata.date,
    metadata.summary,
    JSON.stringify(metadata.tags),
    metadata.coverAssetId ?? null,
    body,
    parsed.postId,
    parsed.expectedDraftRevision,
  ).run();
  if (result.meta.changes !== 1) {
    throw new Error("This draft changed in another tab. Reload it before restoring a revision.");
  }
  await audit.statement.run();
  return { ok: true, draftRevision: nextRevision };
}

export async function deletePost(input: unknown): Promise<{ ok: true }> {
  const admin = await requireActionAdmin({ write: true, fresh: true });
  const parsed = DeletePostSchema.parse(input);
  const draft = await getPostDraft(admin.db, parsed.postId);
  if (!draft) throw new Error("Draft not found");
  if (draft.revision !== parsed.expectedDraftRevision) {
    throw new Error("This draft changed in another tab. Reload it before deleting the post.");
  }

  const assets = await admin.db.prepare(
    "SELECT r2_key FROM blog_assets WHERE post_id = ?",
  ).bind(parsed.postId).all<{ r2_key: string }>();
  const audit = admin.prepareAudit({
    action: "delete_post",
    targetTable: "post_drafts",
    targetId: parsed.postId,
    diff: {
      draftRevision: draft.revision,
      publishedRevision: draft.publishedRevision,
      assetCount: assets.results.length,
    },
  });

  await admin.db.batch([
    admin.db.prepare("DELETE FROM posts WHERE id = ?").bind(parsed.postId),
    admin.db.prepare("DELETE FROM post_drafts WHERE post_id = ?").bind(parsed.postId),
    audit.statement,
  ]);
  invalidatePublished([draft.publishedSlug ?? draft.proposedSlug]);

  const bucket = (admin.env as typeof admin.env & { R2?: R2Bucket }).R2;
  if (bucket) {
    await Promise.allSettled((assets.results ?? []).map((asset) => bucket.delete(asset.r2_key)));
  }
  return { ok: true };
}
