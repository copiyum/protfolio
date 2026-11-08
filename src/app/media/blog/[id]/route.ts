import { getCloudflareContext } from "@opennextjs/cloudflare";
import { isSafeBlogAssetId } from "@/lib/blog/assets";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSafeBlogAssetId(id)) return new Response("Not found", { status: 404 });

  const ctx = await getCloudflareContext({ async: true });
  const env = ctx.env as unknown as { DB: D1Database; R2: R2Bucket };
  const asset = await env.DB.prepare(
    "SELECT r2_key, mime_type FROM blog_assets WHERE id = ? AND deleted_at IS NULL",
  ).bind(id).first<{ r2_key: string; mime_type: string }>();
  if (!asset) return new Response("Not found", { status: 404 });

  const object = await env.R2.get(asset.r2_key);
  if (!object?.body) return new Response("Not found", { status: 404 });

  return new Response(object.body, {
    headers: {
      "Content-Type": asset.mime_type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "ETag": object.httpEtag,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
