import { PostEditor } from "@/components/admin/posts/PostEditor";
import { createDraft } from "@/lib/admin/actions/posts";
import { adminAction } from "@/lib/admin/actions/result";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function NewPostPage() {
  async function save(values: Parameters<typeof createDraft>[0]) {
    "use server";
    return adminAction(() => createDraft(values));
  }

  return <PostEditor onCreate={save} />;
}
