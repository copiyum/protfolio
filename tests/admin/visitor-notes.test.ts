import { beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "cloudflare:workers";
import { applyD1Migrations } from "cloudflare:test";
import {
  VISITOR_NOTE_R2_PREFIX,
  VisitorNoteValidationError,
  parsePngDataUrl,
  parseVisitorNoteSubmission,
} from "@/lib/visitor-notes";
import {
  handleVisitorNoteImageGet,
  handleVisitorNotesGet,
  handleVisitorNotesPost,
} from "@/lib/visitor-notes-api";
import { deleteVisitorNoteWithAdmin } from "@/lib/admin/visitor-notes";
import { prepareAudit, writeAudit } from "@/lib/admin/audit";
import type { ActionAdmin } from "@/lib/admin/actions/_security";

function pngDataUrl(width = 16, height = 12): string {
  const bytes = new Uint8Array(128);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.set([0x00, 0x00, 0x00, 0x0d], 8);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:image/png;base64,${btoa(binary)}`;
}

async function clearR2() {
  const list = await env.R2.list({ prefix: VISITOR_NOTE_R2_PREFIX });
  await Promise.all(list.objects.map((object) => env.R2.delete(object.key)));
}

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://sarang.dev/api/visitor-notes", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://sarang.dev",
      "cf-connecting-ip": "1.2.3.4",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function adminContext(): ActionAdmin {
  const auditMeta = { actorCredentialId: "cred-visitor", ip: "1.2.3.4", ua: "vitest" };
  return {
    env: {
      DB: env.DB,
      R2: env.R2,
      ADMIN_COOKIE_SECRET: "secret",
      CF_ACCESS_AUD: "aud",
      CF_ACCESS_TEAM_DOMAIN: "team.example.com",
      TURNSTILE_SECRET: env.TURNSTILE_SECRET,
    } as ActionAdmin["env"] & { R2: R2Bucket },
    db: env.DB,
    credentialId: "cred-visitor",
    session: {
      sessionId: "session-1",
      credentialId: "cred-visitor",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      nonce: "nonce",
      freshAt: Date.now(),
    },
    meta: { ip: "1.2.3.4", ua: "vitest" },
    auditMeta,
    prepareAudit: (input) => prepareAudit(env.DB, { ...input, ...auditMeta }),
    writeAudit: (input) => writeAudit(env.DB, { ...input, ...auditMeta }),
  };
}

describe("visitor notes", () => {
  beforeEach(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
    await env.DB.exec("DELETE FROM audit_log; DELETE FROM rate_limits; DELETE FROM visitor_notes;");
    await clearR2();
    vi.restoreAllMocks();
  });

  it("accepts strict PNG data URLs and rejects non-PNG payloads", () => {
    expect(parsePngDataUrl(pngDataUrl(20, 10))).toMatchObject({ width: 20, height: 10 });
    expect(() => parsePngDataUrl("data:image/svg+xml;base64,PHN2Zy8+")).toThrow(VisitorNoteValidationError);
    expect(() => parsePngDataUrl("data:image/png;base64,SGVsbG8=")).toThrow(VisitorNoteValidationError);
    expect(() => parsePngDataUrl(pngDataUrl(4096, 10))).toThrow(VisitorNoteValidationError);
  });

  it("normalizes note text as plain text", () => {
    const parsed = parseVisitorNoteSubmission({
      name: " <b>Ash</b>\u0000 ",
      message: " hello\n<script>alert(1)</script> ",
      color: "#3b82f6",
      imageDataUrl: pngDataUrl(),
      cfTurnstileResponse: "token",
    });
    expect(parsed.name).toBe("bAsh/b");
    expect(parsed.message).toBe("hello scriptalert(1)/script");
  });

  it("requires same-origin JSON submissions", async () => {
    const response = await handleVisitorNotesPost(
      request({}, { origin: "https://evil.example" }),
      env,
      { consume: async () => true, verifyTurnstile: async () => ({ ok: true }) },
    );
    expect(response.status).toBe(403);
  });

  it("stores submissions in D1 and R2 without exposing R2 keys", async () => {
    const response = await handleVisitorNotesPost(
      request({
        name: "Ash",
        message: "hi",
        color: "#3b82f6",
        imageDataUrl: pngDataUrl(),
        cfTurnstileResponse: "token",
      }),
      env,
      { consume: async () => true, verifyTurnstile: async () => ({ ok: true }) },
    );
    expect(response.status).toBe(201);
    const payload = await response.json() as { note: { id: string; imageUrl: string; r2Key?: string } };
    expect(payload.note.imageUrl).toBe(`/api/visitor-notes/${payload.note.id}/image`);
    expect(payload.note.r2Key).toBeUndefined();

    const dbRow = await env.DB.prepare("SELECT r2_key FROM visitor_notes WHERE id = ?")
      .bind(payload.note.id)
      .first<{ r2_key: string }>();
    expect(dbRow?.r2_key).toBe(`${VISITOR_NOTE_R2_PREFIX}${payload.note.id}.png`);
    await expect(env.R2.head(dbRow!.r2_key)).resolves.toBeTruthy();

    const listResponse = await handleVisitorNotesGet(new Request("https://sarang.dev/api/visitor-notes"), env);
    const listPayload = await listResponse.json() as { notes: Array<{ id: string; r2Key?: string }> };
    expect(listPayload.notes).toHaveLength(1);
    expect(listPayload.notes[0].r2Key).toBeUndefined();
  });

  it("serves note images only through existing note ids", async () => {
    const createResponse = await handleVisitorNotesPost(
      request({
        name: "Ash",
        color: "#3b82f6",
        imageDataUrl: pngDataUrl(),
        cfTurnstileResponse: "token",
      }),
      env,
      { consume: async () => true, verifyTurnstile: async () => ({ ok: true }) },
    );
    const payload = await createResponse.json() as { note: { id: string } };
    const imageResponse = await handleVisitorNoteImageGet(
      new Request(`https://sarang.dev/api/visitor-notes/${payload.note.id}/image`),
      env,
      payload.note.id,
    );
    expect(imageResponse.status).toBe(200);
    expect(imageResponse.headers.get("content-type")).toBe("image/png");
    expect(imageResponse.headers.get("x-content-type-options")).toBe("nosniff");

    const missing = await handleVisitorNoteImageGet(
      new Request("https://sarang.dev/api/visitor-notes/not-a-note/image"),
      env,
      "not-a-note",
    );
    expect(missing.status).toBe(404);
  });

  it("admin delete removes the public row, writes audit, and deletes the R2 object", async () => {
    const createResponse = await handleVisitorNotesPost(
      request({
        name: "Ash",
        color: "#3b82f6",
        imageDataUrl: pngDataUrl(),
        cfTurnstileResponse: "token",
      }),
      env,
      { consume: async () => true, verifyTurnstile: async () => ({ ok: true }) },
    );
    const payload = await createResponse.json() as { note: { id: string } };
    const updatedTags: string[] = [];

    await expect(deleteVisitorNoteWithAdmin(adminContext(), payload.note.id, (tag) => updatedTags.push(tag)))
      .resolves.toEqual({ ok: true, objectDeleted: true });

    await expect(env.DB.prepare("SELECT id FROM visitor_notes WHERE id = ?").bind(payload.note.id).first()).resolves.toBeNull();
    await expect(env.R2.head(`${VISITOR_NOTE_R2_PREFIX}${payload.note.id}.png`)).resolves.toBeNull();
    await expect(env.DB.prepare("SELECT action FROM audit_log WHERE target_id = ?").bind(payload.note.id).first<{ action: string }>())
      .resolves.toEqual({ action: "delete_visitor_note" });
    expect(updatedTags).toEqual(["visitor-notes"]);
  });
});
