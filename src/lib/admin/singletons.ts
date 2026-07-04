import { rowToProfileSettings, type ProfileSettings, type ProfileSettingsRow } from "@/lib/profile-settings";
import type { SeoInput } from "./schema/seo";

export async function readProfileSettings(db: D1Database): Promise<ProfileSettings> {
  const row = await db
    .prepare(
      `SELECT photo_light, photo_dark, bio_text, bio_highlights, selection_tooltip_phrases,
              location_label, latitude, longitude, timezone, timezone_label
       FROM profile_settings
       WHERE id = 'singleton'`,
    )
    .first<ProfileSettingsRow>();
  return rowToProfileSettings(row);
}

export async function readSeoDefaults(db: D1Database): Promise<SeoInput> {
  const row = await db
    .prepare("SELECT title_template, og_image, description FROM seo_defaults WHERE id = 'singleton'")
    .first<{
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
