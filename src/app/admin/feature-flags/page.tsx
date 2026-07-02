import { getSeo, setSeo } from "@/lib/admin/actions/seo";
import { listFlags, setFlag, deleteFlag } from "@/lib/admin/actions/feature-flags";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export default async function FeatureFlagsPage() {
  const flags = await listFlags().catch(() => []);
  const seo = await getSeo().catch(() => ({ title_template: "", og_image: null, description: "" }));

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
                      <form
                        action={async () => {
                          "use server";
                          await deleteFlag(f.key);
                        }}
                      >
                        <button className="text-xs text-red-500 hover:underline">Delete</button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <form
          action={async (fd: FormData) => {
            "use server";
            await setFlag({
              key: fd.get("key"),
              value: fd.get("value"),
            });
          }}
          className="mt-4 flex gap-2"
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
          <button className="rounded bg-[color:var(--foreground)] px-3 py-1 text-sm text-[color:var(--background)]">
            Set
          </button>
        </form>
      </section>

      <section>
        <h1 className="mb-4 text-2xl font-semibold">SEO Defaults</h1>
        <form
          action={async (fd: FormData) => {
            "use server";
            await setSeo({
              title_template: fd.get("title_template") ?? "",
              og_image: fd.get("og_image") || null,
              description: fd.get("description") ?? "",
            });
          }}
          className="max-w-xl space-y-3"
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
          <button className="rounded bg-[color:var(--foreground)] px-3 py-1 text-sm text-[color:var(--background)]">
            Save
          </button>
        </form>
      </section>
    </div>
  );
}