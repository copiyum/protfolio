import { notFound } from "next/navigation";
import { ArticleShell } from "@/components/blog/ArticleShell";
import { getPostDraft } from "@/lib/admin/posts";
import { getAdminDb } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DraftPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const draft = await getPostDraft(await getAdminDb(), id);
  if (!draft) notFound();

  return (
    <ArticleShell
      preview
      post={{
        title: draft.title,
        date: draft.date,
        summary: draft.summary,
        tags: draft.tags,
      }}
      document={draft.body}
    />
  );
}
