import type { NextRequest } from "next/server";
import sharp from "sharp";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { verifySig, MAX_BYTES, MAX_DIM } from "@/lib/admin/r2";

export const runtime = "nodejs"; // sharp native binaries don't run on edge

export async function PUT(req: NextRequest) {
  const ctx = await getCloudflareContext({ async: true });
  const env = ctx.env as unknown as { R2: R2Bucket; R2_PRESIGN_SECRET: string };

  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  const exp = url.searchParams.get("exp");
  const sig = url.searchParams.get("sig");
  if (!key || !exp || !sig) return new Response("Bad request", { status: 400 });
  if (!verifySig(key, exp, sig, env.R2_PRESIGN_SECRET)) return new Response("Bad signature", { status: 401 });

  const buf = await req.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) return new Response("Too large", { status: 413 });

  let img = sharp(Buffer.from(buf));
  const meta = await img.metadata();
  if ((meta.width ?? 0) > MAX_DIM || (meta.height ?? 0) > MAX_DIM) {
    return new Response("Dimensions too large", { status: 400 });
  }

  // Re-encode: strips EXIF + blocks polyglot files. Output webp for consistency.
  const out = await img.rotate().webp({ quality: 85 }).toBuffer();
  await env.R2.put(key, out, { httpMetadata: { contentType: "image/webp" } });
  return new Response(JSON.stringify({ key }), { status: 200 });
}