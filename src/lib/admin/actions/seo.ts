"use server";
import { updateTag } from "next/cache";
import { SeoInput } from "../schema/seo";
import { readSeoDefaults } from "../singletons";
import { requireActionAdmin } from "./_security";

// Singleton row (id='singleton'). Not using generic CRUD.
export async function getSeo(): Promise<SeoInput> {
  const admin = await requireActionAdmin();
  return readSeoDefaults(admin.db);
}

export async function setSeo(input: unknown): Promise<{ ok: true }> {
  const admin = await requireActionAdmin({ write: true });
  const parsed = SeoInput.parse(input);
  const db = admin.db;
  const audit = admin.prepareAudit({
    action: "set_seo",
    targetTable: "seo_defaults",
    targetId: "singleton",
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
