/* eslint-disable @next/next/no-img-element -- Admin-configured profile URLs are arbitrary; next/image remote allowlists would reject valid previews. */
import { setProfileSettings } from "@/lib/admin/actions/profile";
import { adminAction, type AdminActionResult } from "@/lib/admin/actions/result";
import { getProfileSettings } from "@/lib/admin/queries";
import { DEFAULT_PROFILE_SETTINGS } from "@/lib/profile-settings";
import { AdminForm } from "@/components/admin/AdminForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function nullableText(value: FormDataEntryValue | null): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? text : null;
}

function textareaList(value: FormDataEntryValue | null): string[] {
  const text = typeof value === "string" ? value : "";
  return text
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default async function ProfileAdminPage() {
  const profile = await getProfileSettings().catch(() => DEFAULT_PROFILE_SETTINGS);

  async function saveProfile(_previousState: AdminActionResult, fd: FormData): Promise<AdminActionResult> {
    "use server";
    return adminAction(async () => {
      await setProfileSettings({
        photo_light: nullableText(fd.get("photo_light")),
        photo_dark: nullableText(fd.get("photo_dark")),
        bio_text: fd.get("bio_text"),
        bio_highlights: textareaList(fd.get("bio_highlights")),
        selection_tooltip_phrases: textareaList(fd.get("selection_tooltip_phrases")),
        location_label: fd.get("location_label"),
        latitude: fd.get("latitude"),
        longitude: fd.get("longitude"),
        timezone: fd.get("timezone"),
        timezone_label: nullableText(fd.get("timezone_label")),
      });
      return { ok: true, message: "Profile saved." };
    });
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Profile</h1>
      <AdminForm action={saveProfile} className="max-w-xl space-y-4" submitLabel="Save">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded border border-[color:var(--foreground)]/10 p-3">
            <p className="mb-2 text-xs uppercase tracking-wider text-[color:var(--foreground)]/60">Light photo</p>
            {profile.photoLight ? (
              <img src={profile.photoLight} alt="" className="size-20 rounded-full object-cover" />
            ) : (
              <div className="grid size-20 place-items-center rounded-full bg-[color:var(--foreground)]/10 text-xl font-semibold">S</div>
            )}
          </div>
          <div className="rounded border border-[color:var(--foreground)]/10 p-3">
            <p className="mb-2 text-xs uppercase tracking-wider text-[color:var(--foreground)]/60">Dark photo</p>
            {profile.photoDark ? (
              <img src={profile.photoDark} alt="" className="size-20 rounded-full object-cover" />
            ) : (
              <div className="grid size-20 place-items-center rounded-full bg-[color:var(--foreground)]/10 text-xl font-semibold">S</div>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-[color:var(--foreground)]/60">
            Light photo URL
          </label>
          <input
            name="photo_light"
            defaultValue={profile.photoLight ?? ""}
            className="w-full rounded border border-[color:var(--foreground)]/20 bg-transparent px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-[color:var(--foreground)]/60">
            Dark photo URL
          </label>
          <input
            name="photo_dark"
            defaultValue={profile.photoDark ?? ""}
            className="w-full rounded border border-[color:var(--foreground)]/20 bg-transparent px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-[color:var(--foreground)]/60">
            Bio
          </label>
          <textarea
            name="bio_text"
            required
            rows={4}
            defaultValue={profile.bioText}
            className="w-full rounded border border-[color:var(--foreground)]/20 bg-transparent px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-[color:var(--foreground)]/60">
            Bio highlights
          </label>
          <textarea
            name="bio_highlights"
            rows={3}
            defaultValue={profile.bioHighlights.join("\n")}
            className="w-full rounded border border-[color:var(--foreground)]/20 bg-transparent px-2 py-1 font-mono text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-[color:var(--foreground)]/60">
            Selection tooltip phrases
          </label>
          <textarea
            name="selection_tooltip_phrases"
            rows={3}
            defaultValue={profile.selectionTooltipPhrases.join("\n")}
            className="w-full rounded border border-[color:var(--foreground)]/20 bg-transparent px-2 py-1 font-mono text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-[color:var(--foreground)]/60">
            Location
          </label>
          <input
            name="location_label"
            required
            defaultValue={profile.locationLabel}
            className="w-full rounded border border-[color:var(--foreground)]/20 bg-transparent px-2 py-1 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-[color:var(--foreground)]/60">
              Latitude
            </label>
            <input
              name="latitude"
              required
              type="number"
              step="any"
              min="-90"
              max="90"
              defaultValue={profile.latitude}
              className="w-full rounded border border-[color:var(--foreground)]/20 bg-transparent px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-[color:var(--foreground)]/60">
              Longitude
            </label>
            <input
              name="longitude"
              required
              type="number"
              step="any"
              min="-180"
              max="180"
              defaultValue={profile.longitude}
              className="w-full rounded border border-[color:var(--foreground)]/20 bg-transparent px-2 py-1 text-sm"
            />
          </div>
        </div>
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-[color:var(--foreground)]/60">
              Timezone
            </label>
            <input
              name="timezone"
              required
              defaultValue={profile.timezone}
              className="w-full rounded border border-[color:var(--foreground)]/20 bg-transparent px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-[color:var(--foreground)]/60">
              Label
            </label>
            <input
              name="timezone_label"
              defaultValue={profile.timezoneLabel}
              className="w-full rounded border border-[color:var(--foreground)]/20 bg-transparent px-2 py-1 text-sm"
            />
          </div>
        </div>
      </AdminForm>
    </div>
  );
}
