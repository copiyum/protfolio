import { getCloudflareContext } from "@opennextjs/cloudflare";
import { handleVisitorNoteImageGet, type VisitorNotesEnv } from "@/lib/visitor-notes-api";

async function getEnv(): Promise<VisitorNotesEnv> {
  const ctx = await getCloudflareContext({ async: true });
  return ctx.env as unknown as VisitorNotesEnv;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return handleVisitorNoteImageGet(request, await getEnv(), id);
}
