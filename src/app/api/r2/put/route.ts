import type { NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { verifySig, validateImage } from "@/lib/admin/r2";

// No sharp — Cloudflare Images binding (cf-image) handles transforms at edge.
// Validation here: signature + MIME + size only. Polyglot blocking via R2
// Content-Type header + Images binding's strict decoder downstream.

export async function PUT(req: NextRequest) {
  const ctx = await getCloudflareContext({ async: true });
  const env = ctx.env as unknown as { R2: R2Bucket; R2_PRESIGN_SECRET: string };

  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  const exp = url.searchParams.get("exp");
  const sig = url.searchParams.get("sig");
  if (!key || !exp || !sig) return new Response("Bad request", { status: 400 });
  if (!verifySig(key, exp, sig, env.R2_PRESIGN_SECRET)) return new Response("Bad signature", { status: 401 });

  const mime = req.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
  const buf = await req.arrayBuffer();
  try {
    validateImage(mime, buf.byteLength);
  } catch (e) {
    return new Response((e as Error).message, { status: 400 });
  }

  await env.R2.put(key, buf, { httpMetadata: { contentType: mime } });
  return new Response(JSON.stringify({ key }), { status: 200 });
}