import { z } from "zod";
import { OptionalHttpsUrl } from "./url";
import { DEFAULT_PROFILE_SETTINGS, isValidTimeZone } from "@/lib/profile-settings";

export const ProfileSettingsInput = z.object({
  photo_light: OptionalHttpsUrl,
  photo_dark: OptionalHttpsUrl,
  bio_text: z.string().trim().min(1).max(700).default(DEFAULT_PROFILE_SETTINGS.bioText),
  bio_highlights: z.array(z.string().trim().min(1).max(120)).max(20).default(DEFAULT_PROFILE_SETTINGS.bioHighlights),
  selection_tooltip_phrases: z.array(z.string().trim().min(1).max(80)).max(20).default(DEFAULT_PROFILE_SETTINGS.selectionTooltipPhrases),
  location_label: z.string().trim().min(1).max(100).default(DEFAULT_PROFILE_SETTINGS.locationLabel),
  latitude: z.coerce.number().min(-90).max(90).default(DEFAULT_PROFILE_SETTINGS.latitude),
  longitude: z.coerce.number().min(-180).max(180).default(DEFAULT_PROFILE_SETTINGS.longitude),
  timezone: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .refine(isValidTimeZone, "Expected an IANA timezone, for example Asia/Kolkata")
    .default(DEFAULT_PROFILE_SETTINGS.timezone),
  timezone_label: z.string().trim().max(30).nullable().optional(),
});

export type ProfileSettingsInput = z.infer<typeof ProfileSettingsInput>;
