import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getFlag<T = unknown>(key: string): Promise<T | null> {
  try {
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as unknown as { DB: D1Database }).DB;
    const row = await db.prepare("SELECT value FROM feature_flags WHERE key = ?").bind(key).first<{ value: string }>();
    if (!row) return null;
    try {
      return JSON.parse(row.value) as T;
    } catch {
      return null;
    }
  } catch (e) {
    console.warn(`[getFlag:${key}] D1 read failed`, e);
    return null;
  }
}
