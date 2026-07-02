"use server";
import { updateTag } from "next/cache";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { headers } from "next/headers";
import { SeoInput } from "../schema/seo";
import { writeAudit } from "../audit";

// Singleton row (id='singleton'). Not using generic CRUD.
export async function getSeo(): Promise<SeoInput> {
  const ctx = await getCloudflareContext({ async: true });
  const db = (ctx.env as unknown as { DB: D1Database }).DB;
  const row = await db.prepare("SELECT title_template, og_image, description FROM seo_defaults WHERE id = 'singleton'").first<{
    title_template: string;
    og_image: string | null;
    description: string;
  }>();
  return {
    title_template: row?.title_template ?? "",
    og_image: row?.og_image ?? null,
    description: row?.description ?? "",
  };
}

export async function setSeo(input: unknown): Promise<{ ok: true }> {
  const parsed = SeoInput.parse(input);
  const ctx = await getCloudflareContext({ async: true });
  const db = (ctx.env as unknown as { DB: D1Database }).DB;
  const h = await headers();
  await db.prepare(
    `INSERT INTO seo_defaults (id, title_template, og_image, description)
     VALUES ('singleton', ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title_template = excluded.title_template,
       og_image = excluded.og_image,
       description = excluded.description,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
  ).bind(parsed.title_template, parsed.og_image ?? null, parsed.description).run();
  await writeAudit(db, {
    action: "set_seo",
    targetTable: "seo_defaults",
    targetId: "singleton",
    actorCredentialId: h.get("x-actor-credential-id") ?? undefined,
    diff: parsed as Record<string, unknown>,
  });
  updateTag("seo");
  return { ok: true };
}