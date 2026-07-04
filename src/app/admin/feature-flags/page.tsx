import { setSeo } from "@/lib/admin/actions/seo";
import { setFlag, deleteFlag } from "@/lib/admin/actions/feature-flags";
import { adminAction, type AdminActionResult } from "@/lib/admin/actions/result";
import { getSeoDefaults, listFeatureFlags } from "@/lib/admin/queries";
import { AdminActionButton } from "@/components/admin/AdminActionButton";
import { AdminForm } from "@/components/admin/AdminForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function FeatureFlagsPage() {
  const flags = await listFeatureFlags().catch(() => []);
  const seo = await getSeoDefaults().catch(() => ({ title_template: "", og_image: null, description: "" }));

  async function setFlagAction(_previousState: AdminActionResult, fd: FormData): Promise<AdminActionResult> {
    "use server";
    return adminAction(async () => {
      await setFlag({
        key: fd.get("key"),
        value: fd.get("value"),
      });
      return { ok: true, message: "Flag saved." };
    });
  }

  async function setSeoAction(_previousState: AdminActionResult, fd: FormData): Promise<AdminActionResult> {
    "use server";
    return adminAction(async () => {
      await setSeo({
        title_template: fd.get("title_template") ?? "",
        og_image: fd.get("og_image") || null,
        description: fd.get("description") ?? "",
      });
      return { ok: true, message: "SEO defaults saved." };
    });
  }

  return (
    <div className="space-y-10">
      <section>
        <h1 className="mb-4 text-2xl font-semibold">Feature Flags</h1>
        <div className="overflow-x-auto rounded border border-[color:var(--foreground)]/10">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--foreground)]/5 text-left">
              <tr>
                <th className="p-2 font-medium">Key</th>
                <th className="p-2 font-medium">Value</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {flags.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-[color:var(--foreground)]/50">
                    No flags.
                  </td>
                </tr>
              ) : (
                flags.map((f) => (
                  <tr key={f.key} className="border-t border-[color:var(--foreground)]/5">
                    <td className="p-2 font-mono text-xs">{f.key}</td>
                    <td className="p-2 font-mono text-xs">{JSON.stringify(f.value)}</td>
                    <td className="p-2">
                      <AdminActionButton
                        action={async () => {
                          "use server";
                          return adminAction(async () => {
                            await deleteFlag(f.key);
                            return { ok: true, message: "Flag deleted." };
                          });
                        }}
                        confirmMessage={`Delete flag "${f.key}"?`}
                        pendingLabel="Deleting..."
                        className="text-xs text-red-500 hover:underline disabled:opacity-50"
                      >
                        Delete
                      </AdminActionButton>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminForm
          action={setFlagAction}
          className="mt-4 flex gap-2"
          submitLabel="Set"
        >
          <input
            name="key"
            placeholder="flag_key"
            required
            className="rounded border border-[color:var(--foreground)]/20 bg-transparent px-2 py-1 text-sm"
          />
          <input
            name="value"
            placeholder='value (JSON or string)'
            required
            className="flex-1 rounded border border-[color:var(--foreground)]/20 bg-transparent px-2 py-1 text-sm"
          />
        </AdminForm>
      </section>

      <section>
        <h1 className="mb-4 text-2xl font-semibold">SEO Defaults</h1>
        <AdminForm
          action={setSeoAction}
          className="max-w-xl space-y-3"
          submitLabel="Save"
        >
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-[color:var(--foreground)]/60">
              Title template
            </label>
            <input
              name="title_template"
              defaultValue={seo.title_template}
              className="w-full rounded border border-[color:var(--foreground)]/20 bg-transparent px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-[color:var(--foreground)]/60">
              OG image URL
            </label>
            <input
              name="og_image"
              type="url"
              defaultValue={seo.og_image ?? ""}
              className="w-full rounded border border-[color:var(--foreground)]/20 bg-transparent px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-[color:var(--foreground)]/60">
              Description
            </label>
            <textarea
              name="description"
              defaultValue={seo.description}
              rows={3}
              className="w-full rounded border border-[color:var(--foreground)]/20 bg-transparent px-2 py-1 text-sm"
            />
          </div>
        </AdminForm>
      </section>
    </div>
  );
}
