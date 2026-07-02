export async function consume(
  d1: D1Database,
  key: string,
  limit: number,
  windowSec: number
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const row = await d1.prepare("SELECT window_start, count FROM rate_limits WHERE scope_key = ?").bind(key).first<{ window_start: string; count: number }>();
  const winStart = row ? parseInt(row.window_start, 10) : 0;
  if (!row || now - winStart >= windowSec) {
    await d1.prepare("INSERT OR REPLACE INTO rate_limits (scope_key, window_start, count) VALUES (?, ?, 1)").bind(key, now).run();
    return true;
  }
  if (row.count >= limit) return false;
  await d1.prepare("UPDATE rate_limits SET count = count + 1 WHERE scope_key = ?").bind(key).run();
  return true;
}

export async function reset(d1: D1Database, key: string): Promise<void> {
  await d1.prepare("DELETE FROM rate_limits WHERE scope_key = ?").bind(key).run();
}