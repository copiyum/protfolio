import { beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "cloudflare:workers";
import { applyD1Migrations } from "cloudflare:test";
import { prepareAudit, writeAudit } from "@/lib/admin/audit";
import type { ActionAdmin } from "@/lib/admin/actions/_security";

const { requireActionAdmin } = vi.hoisted(() => ({
  requireActionAdmin: vi.fn(),
}));

vi.mock("@/lib/admin/actions/_security", () => ({ requireActionAdmin }));

import {
  createDraft,
  deletePost,
  publishPost,
  restoreRevision,
  saveDraft,
  unpublishPost,
} from "@/lib/admin/actions/posts";

function adminContext(): ActionAdmin {
  const auditMeta = { actorCredentialId: "cred-blog", ip: "1.2.3.4", ua: "vitest" };
  return {
    env: {
      DB: env.DB,
      ADMIN_COOKIE_SECRET: "blog-admin-key-9vN4xQ2mL7pR8sT6cD5",
      CF_ACCESS_AUD: "aud",
      CF_ACCESS_TEAM_DOMAIN: "team.example.com",
    },
    db: env.DB,
    credentialId: "cred-blog",
    session: {
      sessionId: "session-blog",
      credentialId: "cred-blog",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      nonce: "nonce",
      freshAt: Date.now(),
    },
    meta: { ip: "1.2.3.4", storageIp: "ip:test", ua: "vitest" },
    auditMeta,
    prepareAudit: (input) => prepareAudit(env.DB, { ...input, ...auditMeta }),
    writeAudit: (input) => writeAudit(env.DB, { ...input, ...auditMeta }),
  };
}

function metadata(text: string) {
  return {
    title: "A precise field note",
    proposedSlug: "a-precise-field-note",
    date: "2026-07-15",
    summary: "A summary",
    tags: ["systems"],
    body: {
      version: 1 as const,
      layout: "field-note" as const,
      blocks: [{ id: "intro", type: "paragraph" as const, text }],
    },
  };
}

describe("blog post actions", () => {
  beforeEach(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
    await env.DB.exec("DELETE FROM post_revisions; DELETE FROM blog_assets; DELETE FROM posts; DELETE FROM post_drafts;");
    requireActionAdmin.mockReset();
    requireActionAdmin.mockResolvedValue(adminContext());
  });

  it("keeps draft and published revisions separate through the editing lifecycle", async () => {
    const created = await createDraft(metadata("First draft"));
    expect(created).toMatchObject({ ok: true, draftRevision: 0 });

    const saved = await saveDraft({
      ...metadata("Ready to publish"),
      postId: created.postId,
      expectedDraftRevision: created.draftRevision,
    });
    expect(saved).toEqual({ ok: true, draftRevision: 1 });

    await expect(saveDraft({
      ...metadata("Stale overwrite"),
      postId: created.postId,
      expectedDraftRevision: 0,
    })).rejects.toThrow("This draft changed in another tab");

    const published = await publishPost({
      postId: created.postId,
      expectedDraftRevision: saved.draftRevision,
    });
    expect(published).toMatchObject({
      ok: true,
      url: "/blog/a-precise-field-note",
      draftRevision: 1,
      publishedRevision: 1,
    });

    const savedAgain = await saveDraft({
      ...metadata("A new unpublished edit"),
      postId: created.postId,
      expectedDraftRevision: published.draftRevision,
    });
    expect(savedAgain).toEqual({ ok: true, draftRevision: 2 });

    const beforeUnpublish = await env.DB.prepare(
      `SELECT p.published, p.revision AS published_revision, p.body AS published_body,
              d.revision AS draft_revision, d.base_revision, d.body AS draft_body
       FROM posts p JOIN post_drafts d ON d.post_id = p.id WHERE p.id = ?`,
    ).bind(created.postId).first<{
      published: number;
      published_revision: number;
      published_body: string;
      draft_revision: number;
      base_revision: number;
      draft_body: string;
    }>();
    expect(beforeUnpublish).toMatchObject({
      published: 1,
      published_revision: 1,
      draft_revision: 2,
      base_revision: 1,
    });
    expect(JSON.parse(beforeUnpublish!.published_body).blocks[0].text).toBe("Ready to publish");
    expect(JSON.parse(beforeUnpublish!.draft_body).blocks[0].text).toBe("A new unpublished edit");

    await expect(unpublishPost({
      postId: created.postId,
      expectedPublishedRevision: published.publishedRevision,
    })).resolves.toEqual({ ok: true });

    await expect(env.DB.prepare("SELECT published FROM posts WHERE id = ?")
      .bind(created.postId)
      .first<{ published: number }>()).resolves.toEqual({ published: 0 });
    await expect(env.DB.prepare("SELECT COUNT(*) AS count FROM post_revisions WHERE post_id = ?")
      .bind(created.postId)
      .first<{ count: number }>()).resolves.toEqual({ count: 1 });

    const restored = await restoreRevision({
      postId: created.postId,
      revision: 1,
      expectedDraftRevision: savedAgain.draftRevision,
    });
    expect(restored).toEqual({ ok: true, draftRevision: 3 });
    const restoredDraft = await env.DB.prepare(
      "SELECT body, base_revision FROM post_drafts WHERE post_id = ?",
    ).bind(created.postId).first<{ body: string; base_revision: number }>();
    expect(JSON.parse(restoredDraft!.body).blocks[0].text).toBe("Ready to publish");
    expect(restoredDraft!.base_revision).toBe(1);

    await env.DB.prepare(
      `INSERT INTO blog_assets (id, post_id, r2_key, mime_type, byte_size, alt_text)
       VALUES (?, ?, ?, 'image/png', 24, 'Temporary image')`,
    ).bind(
      "341a52ea-3ac4-4fd5-961c-c64fb73ab614",
      created.postId,
      `blog-assets/${created.postId}/temporary.png`,
    ).run();
    await expect(deletePost({
      postId: created.postId,
      expectedDraftRevision: restored.draftRevision,
    })).resolves.toEqual({ ok: true });
    await expect(env.DB.prepare("SELECT COUNT(*) AS count FROM post_drafts WHERE post_id = ?")
      .bind(created.postId)
      .first<{ count: number }>()).resolves.toEqual({ count: 0 });
    await expect(env.DB.prepare("SELECT COUNT(*) AS count FROM blog_assets WHERE post_id = ?")
      .bind(created.postId)
      .first<{ count: number }>()).resolves.toEqual({ count: 0 });

    expect(requireActionAdmin.mock.calls.map(([options]) => options)).toEqual([
      { write: true },
      { write: true },
      { write: true },
      { write: true, fresh: true },
      { write: true },
      { write: true, fresh: true },
      { write: true, fresh: true },
      { write: true, fresh: true },
    ]);
  });

  it("refuses to publish a document that references an unavailable image", async () => {
    const created = await createDraft({
      ...metadata("Image-backed draft"),
      body: {
        version: 1 as const,
        layout: "field-note" as const,
        blocks: [{
          id: "missing-image",
          type: "image" as const,
          assetId: "341a52ea-3ac4-4fd5-961c-c64fb73ab614",
          alt: "A missing diagram",
          wide: true,
        }],
      },
    });

    await expect(publishPost({
      postId: created.postId,
      expectedDraftRevision: created.draftRevision,
    })).rejects.toThrow("referenced images are missing");
  });
});
