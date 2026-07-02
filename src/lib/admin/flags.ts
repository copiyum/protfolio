import { cacheTag } from "next/cache";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { fallback } from "@/data/fallback";

export async function getFlag<T = unknown>(key: string): Promise<T | null> {
  "use cache";
  cacheTag("flags", `flag:${key}`);
  try {
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as unknown as { DB: D1Database }).DB;
    const row = await db.prepare("SELECT value FROM feature_flags WHERE key = ?").bind(key).first<{ value: string }>();
    return row ? (JSON.parse(row.value) as T) : null;
  } catch (e) {
    console.warn(`[getFlag:${key}] D1 read failed`, e);
    return null;
  }
}

// Convenience accessors backed by techStack fallback until bento migrates.
export const techStackFallback = fallback.techStack;