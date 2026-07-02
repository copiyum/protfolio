import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createGzip } from "node:zlib";

interface Env {
  DB: D1Database;
  R2: R2Bucket;
  CRON_SECRET: string;
}

// Daily audit_log snapshot to R2 as immutable JSONL.gz.
// Triggered by Cloudflare cron (see wrangler.toml: 0 3 * * *).
export async function GET(req: Request) {
  const ctx = await getCloudflareContext({ async: true });
  const env = ctx.env as unknown as Env;
  if (req.headers.get("cf-cron-secret") !== env.CRON_SECRET && new URL(req.url).searchParams.get("secret") !== env.CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }
  const rows = await env.DB.prepare("SELECT * FROM audit_log WHERE ts >= datetime('now', '-1 day')").all<Record<string, unknown>>();
  const jsonl = (rows.results ?? []).map((r) => JSON.stringify(r)).join("\n");
  const key = `audit/${new Date().toISOString().slice(0, 10)}.jsonl.gz`;
  const gz = await new Promise<Uint8Array>((res, rej) => {
    const chunks: Buffer[] = [];
    const gzStream = createGzip();
    gzStream.on("data", (c) => chunks.push(c));
    gzStream.on("end", () => res(new Uint8Array(Buffer.concat(chunks))));
    gzStream.on("error", rej);
    gzStream.end(jsonl);
  });
  await env.R2.put(key, gz, { httpMetadata: { contentType: "application/gzip" } });
  return new Response(`Snapshot written: ${key} (${rows.results?.length ?? 0} rows)`);
}