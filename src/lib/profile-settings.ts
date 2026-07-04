export interface ProfileSettings {
  photoLight: string | null;
  photoDark: string | null;
  bioText: string;
  bioHighlights: string[];
  selectionTooltipPhrases: string[];
  locationLabel: string;
  latitude: number;
  longitude: number;
  timezone: string;
  timezoneLabel: string;
}

export interface ProfileSettingsRow {
  photo_light: string | null;
  photo_dark: string | null;
  bio_text: string | null;
  bio_highlights: string | null;
  selection_tooltip_phrases: string | null;
  location_label: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  timezone: string | null;
  timezone_label: string | null;
}

export const DEFAULT_PROFILE_SETTINGS: ProfileSettings = {
  photoLight: null,
  photoDark: null,
  bioText: "I'm a software developer. I specialize in clean design and crafting engaging user experiences with great attention to detail.",
  bioHighlights: ["clean design", "engaging user experiences"],
  selectionTooltipPhrases: [
    "nice taste 👀",
    "good eye",
    "solid pick",
    "clean choice",
    "saving this",
    "noted",
  ],
  locationLabel: "Bangalore",
  latitude: 12.9716,
  longitude: 77.5946,
  timezone: "Asia/Kolkata",
  timezoneLabel: "IST",
};

export function isValidTimeZone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export function shortTimeZoneLabel(timezone: string): string {
  try {
    const part = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "short",
    })
      .formatToParts(new Date())
      .find((item) => item.type === "timeZoneName")?.value;
    return part?.trim() || timezone;
  } catch {
    return timezone;
  }
}

function finiteNumber(value: number | string | null | undefined, fallback: number): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function textOrNull(value: string | null | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}

function jsonStringArray(value: string | null | undefined, fallback: string[]): string[] {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return fallback;
    const items = parsed
      .map((item) => typeof item === "string" ? item.trim() : "")
      .filter(Boolean);
    return items.length ? items : fallback;
  } catch {
    return fallback;
  }
}

export function rowToProfileSettings(row: ProfileSettingsRow | null | undefined): ProfileSettings {
  if (!row) return DEFAULT_PROFILE_SETTINGS;

  const timezone = row.timezone?.trim() && isValidTimeZone(row.timezone.trim())
    ? row.timezone.trim()
    : DEFAULT_PROFILE_SETTINGS.timezone;
  const timezoneLabel = row.timezone_label?.trim() || shortTimeZoneLabel(timezone);

  return {
    photoLight: textOrNull(row.photo_light),
    photoDark: textOrNull(row.photo_dark),
    bioText: row.bio_text?.trim() || DEFAULT_PROFILE_SETTINGS.bioText,
    bioHighlights: jsonStringArray(row.bio_highlights, DEFAULT_PROFILE_SETTINGS.bioHighlights),
    selectionTooltipPhrases: jsonStringArray(row.selection_tooltip_phrases, DEFAULT_PROFILE_SETTINGS.selectionTooltipPhrases),
    locationLabel: row.location_label?.trim() || DEFAULT_PROFILE_SETTINGS.locationLabel,
    latitude: finiteNumber(row.latitude, DEFAULT_PROFILE_SETTINGS.latitude),
    longitude: finiteNumber(row.longitude, DEFAULT_PROFILE_SETTINGS.longitude),
    timezone,
    timezoneLabel,
  };
}
