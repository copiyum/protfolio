"use server";

import { updateTag } from "next/cache";
import { ProfileSettingsInput } from "../schema/profile";
import { requireActionAdmin } from "./_security";
import { shortTimeZoneLabel } from "@/lib/profile-settings";

export async function setProfileSettings(input: unknown): Promise<{ ok: true }> {
  const admin = await requireActionAdmin({ write: true });
  const parsed = ProfileSettingsInput.parse(input);
  const timezoneLabel = parsed.timezone_label?.trim() || shortTimeZoneLabel(parsed.timezone);
  const db = admin.db;
  const audit = admin.prepareAudit({
    action: "set_profile",
    targetTable: "profile_settings",
    targetId: "singleton",
    diff: { ...parsed, timezone_label: timezoneLabel },
  });

  await db.batch([
    db.prepare(
      `INSERT INTO profile_settings (
         id, photo_light, photo_dark, bio_text, bio_highlights, selection_tooltip_phrases,
         location_label, latitude, longitude, timezone, timezone_label
       )
       VALUES ('singleton', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         photo_light = excluded.photo_light,
         photo_dark = excluded.photo_dark,
         bio_text = excluded.bio_text,
         bio_highlights = excluded.bio_highlights,
         selection_tooltip_phrases = excluded.selection_tooltip_phrases,
         location_label = excluded.location_label,
         latitude = excluded.latitude,
         longitude = excluded.longitude,
         timezone = excluded.timezone,
         timezone_label = excluded.timezone_label,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
    ).bind(
      parsed.photo_light ?? null,
      parsed.photo_dark ?? null,
      parsed.bio_text,
      JSON.stringify(parsed.bio_highlights),
      JSON.stringify(parsed.selection_tooltip_phrases),
      parsed.location_label,
      parsed.latitude,
      parsed.longitude,
      parsed.timezone,
      timezoneLabel,
    ),
    audit.statement,
  ]);
  updateTag("profile");
  return { ok: true };
}
