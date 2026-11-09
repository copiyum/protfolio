import { notFound } from "next/navigation";
import { PostEditor } from "@/components/admin/posts/PostEditor";
import {
  deletePost,
  publishPost,
  restoreRevision,
  saveDraft,
  unpublishPost,
} from "@/lib/admin/actions/posts";
import { adminAction } from "@/lib/admin/actions/result";
import { getPostDraft, listBlogAssets, listPostRevisions } from "@/lib/admin/posts";
import { getAdminDb } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getAdminDb();
  const draft = await getPostDraft(db, id);
  if (!draft) notFound();

  const [assets, revisions] = await Promise.all([
    listBlogAssets(db, id),
    listPostRevisions(db, id),
  ]);

  async function save(values: Parameters<typeof saveDraft>[0]) {
    "use server";
    return adminAction(() => saveDraft(values));
  }

  async function publish(values: Parameters<typeof publishPost>[0]) {
    "use server";
    return adminAction(() => publishPost(values));
  }

  async function unpublish(values: Parameters<typeof unpublishPost>[0]) {
    "use server";
    return adminAction(() => unpublishPost(values));
  }

  async function restore(values: Parameters<typeof restoreRevision>[0]) {
    "use server";
    return adminAction(() => restoreRevision(values));
  }

  async function remove(values: Parameters<typeof deletePost>[0]) {
    "use server";
    return adminAction(() => deletePost(values));
  }

  return (
    <PostEditor
      key={draft.revision}
      draft={draft}
      assets={assets}
      revisions={revisions}
      onSave={save}
      onPublish={publish}
      onUnpublish={unpublish}
      onRestore={restore}
      onDelete={remove}
    />
  );
}
