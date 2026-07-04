import { setSeo } from "@/lib/admin/actions/seo";
import { adminAction, type AdminActionResult } from "@/lib/admin/actions/result";
import { getSeoDefaults } from "@/lib/admin/queries";
import { AdminForm } from "@/components/admin/AdminForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SeoPage() {
  const seo = await getSeoDefaults().catch(() => ({ title_template: "", og_image: null, description: "" }));

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
    <div>
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
    </div>
  );
}
