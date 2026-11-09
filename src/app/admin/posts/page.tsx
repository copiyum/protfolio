import Link from "next/link";
import { listPostDrafts } from "@/lib/admin/posts";
import { getAdminDb } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PostsPage() {
  const drafts = await listPostDrafts(await getAdminDb());
  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Posts</h1>
          <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
            Drafts are separate from the public projection.
          </p>
        </div>
        <Link
          href="/admin/posts/new"
          className="rounded bg-[color:var(--foreground)] px-3 py-1.5 text-sm text-[color:var(--background)]"
        >
          New post
        </Link>
      </div>

      <div className="overflow-hidden rounded border border-[color:var(--foreground)]/12">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[color:var(--foreground)]/12 text-xs text-[color:var(--foreground)]/55">
            <tr>
              <th className="p-3">Title</th>
              <th className="p-3">Slug</th>
              <th className="p-3">Revision</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {drafts.map((draft) => (
              <tr key={draft.postId} className="border-b border-[color:var(--foreground)]/10 last:border-0">
                <td className="p-3">
                  <Link className="hover:text-[color:var(--accent)]" href={`/admin/posts/${draft.postId}`}>
                    {draft.title}
                  </Link>
                </td>
                <td className="p-3 font-mono text-xs text-[color:var(--foreground)]/55">
                  /{draft.proposedSlug}
                </td>
                <td className="p-3">{draft.revision}</td>
                <td className="p-3">{draft.published ? "Published" : "Draft"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {drafts.length === 0 && (
          <p className="p-8 text-center text-sm text-[color:var(--foreground)]/55">
            Create the first field note.
          </p>
        )}
      </div>
    </div>
  );
}
