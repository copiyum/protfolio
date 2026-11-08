import { getCloudflareContext } from "@opennextjs/cloudflare";
import { isSafeBlogAssetId } from "@/lib/blog/assets";
import { ADMIN_COOKIE_NAME, createAuthGuard, type AdminAuthEnv } from "@/lib/admin/auth-guard";

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

function cookie(request: Request) {
  return request.headers.get("cookie")
    ?.match(new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE_NAME}=([^;]+)`))?.[1] ?? null;
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!isSafeBlogAssetId(id)) return json({ error: "Not found" }, 404);

    const ctx = await getCloudflareContext({ async: true });
    const env = ctx.env as unknown as AdminAuthEnv & { R2: R2Bucket };
    const admin = await createAuthGuard(env).serverActionGuard({
      headers: request.headers,
      cookie: cookie(request),
      write: true,
      fresh: true,
      requestUrl: request.url,
    });
    const asset = await admin.db.prepare(
      "SELECT id, r2_key FROM blog_assets WHERE id = ? AND deleted_at IS NULL",
    ).bind(id).first<{ id: string; r2_key: string }>();
    if (!asset) return json({ error: "Not found" }, 404);

    const used = await admin.db.prepare(
      "SELECT id FROM posts WHERE published = 1 AND (cover_asset_id = ? OR body LIKE ?) LIMIT 1",
    ).bind(id, `%${id}%`).first();
    if (used) return json({ error: "This image is used by a published post" }, 409);

    const audit = admin.prepareAudit({ action: "delete_blog_asset", targetTable: "blog_assets", targetId: id });
    await admin.db.batch([
      admin.db.prepare(
        "UPDATE blog_assets SET deleted_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
      ).bind(id),
      audit.statement,
    ]);
    await env.R2.delete(asset.r2_key).catch(() => {});
    return json({ ok: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not delete image" }, 400);
  }
}
