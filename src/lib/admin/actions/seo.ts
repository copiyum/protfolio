"use server";
import { updateTag } from "next/cache";
import { SeoInput } from "../schema/seo";
import { prepareAudit } from "../audit";
import { requireActionAdmin } from "./_security";

// Singleton row (id='singleton'). Not using generic CRUD.
export async function getSeo(): Promise<SeoInput> {
  const admin = await requireActionAdmin();
  const db = admin.env.DB;
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
  const admin = await requireActionAdmin({ write: true });
  const parsed = SeoInput.parse(input);
  const db = admin.env.DB;
  const audit = prepareAudit(db, {
    action: "set_seo",
    targetTable: "seo_defaults",
    targetId: "singleton",
    actorCredentialId: admin.credentialId,
    ip: admin.meta.ip,
    ua: admin.meta.ua,
    diff: parsed as Record<string, unknown>,
  });
  await db.batch([
    db.prepare(
      `INSERT INTO seo_defaults (id, title_template, og_image, description)
       VALUES ('singleton', ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title_template = excluded.title_template,
         og_image = excluded.og_image,
         description = excluded.description,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
    ).bind(parsed.title_template, parsed.og_image ?? null, parsed.description),
    audit.statement,
  ]);
  updateTag("seo");
  return { ok: true };
}
