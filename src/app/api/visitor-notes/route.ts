import { getCloudflareContext } from "@opennextjs/cloudflare";
import { handleVisitorNotesGet, handleVisitorNotesPost, type VisitorNotesEnv } from "@/lib/visitor-notes-api";

async function getEnv(): Promise<VisitorNotesEnv> {
  const ctx = await getCloudflareContext({ async: true });
  return ctx.env as unknown as VisitorNotesEnv;
}

export async function GET(request: Request) {
  return handleVisitorNotesGet(request, await getEnv());
}

export async function POST(request: Request) {
  return handleVisitorNotesPost(request, await getEnv());
}
