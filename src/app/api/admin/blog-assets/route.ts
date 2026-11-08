import { getCloudflareContext } from "@opennextjs/cloudflare";
import { BlogAssetInputSchema, detectBlogImage, MAX_BLOG_ASSET_BYTES } from "@/lib/blog/assets";
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

export async function POST(request: Request) {
  try {
    const ctx = await getCloudflareContext({ async: true });
    const env = ctx.env as unknown as AdminAuthEnv & { R2: R2Bucket };
    const admin = await createAuthGuard(env).serverActionGuard({
      headers: request.headers,
      cookie: cookie(request),
      write: true,
      requestUrl: request.url,
    });
    const form = await request.formData();
    const file = form.get("file");
    const parsed = BlogAssetInputSchema.parse({ postId: form.get("postId"), altText: form.get("altText") });
    const draft = await admin.db.prepare(
      "SELECT 1 AS present FROM post_drafts WHERE post_id = ? LIMIT 1",
    ).bind(parsed.postId).first<{ present: number }>();
    if (!draft) return json({ error: "Save the draft before uploading images" }, 404);
    if (!(file instanceof File)) return json({ error: "An image file is required" }, 400);
    if (file.size < 1 || file.size > MAX_BLOG_ASSET_BYTES) return json({ error: "Image must be smaller than 5 MB" }, 400);

    const bytes = new Uint8Array(await file.arrayBuffer());
    const image = detectBlogImage(bytes);
    if (!image) return json({ error: "Only PNG, JPEG, WebP, and AVIF images are accepted" }, 415);

    const id = crypto.randomUUID();
    const r2Key = `blog-assets/${parsed.postId}/${id}.${image.extension}`;
    await env.R2.put(r2Key, bytes, {
      httpMetadata: { contentType: image.mimeType },
      customMetadata: { blogAssetId: id, postId: parsed.postId },
    });
    try {
      const audit = admin.prepareAudit({
        action: "upload_blog_asset",
        targetTable: "blog_assets",
        targetId: id,
        diff: {
          postId: parsed.postId,
          mimeType: image.mimeType,
          byteSize: bytes.byteLength,
          width: image.width,
          height: image.height,
        },
      });
      await admin.db.batch([
        admin.db.prepare(
          "INSERT INTO blog_assets (id, post_id, r2_key, mime_type, byte_size, width, height, alt_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        ).bind(
          id,
          parsed.postId,
          r2Key,
          image.mimeType,
          bytes.byteLength,
          image.width ?? null,
          image.height ?? null,
          parsed.altText,
        ),
        audit.statement,
      ]);
    } catch (error) {
      await env.R2.delete(r2Key).catch(() => {});
      throw error;
    }
    return json({
      asset: {
        id,
        postId: parsed.postId,
        mimeType: image.mimeType,
        byteSize: bytes.byteLength,
        width: image.width,
        height: image.height,
        altText: parsed.altText,
        url: `/media/blog/${id}`,
      },
    }, 201);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not upload image" }, 400);
  }
}
