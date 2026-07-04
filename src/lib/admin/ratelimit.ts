export async function consume(
  d1: D1Database,
  key: string,
  limit: number,
  windowSec: number
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const result = await d1
    .prepare(
      `INSERT INTO rate_limits (scope_key, window_start, count)
       VALUES (?, ?, 1)
       ON CONFLICT(scope_key) DO UPDATE SET
         window_start = CASE
           WHEN ? - CAST(window_start AS INTEGER) >= ? THEN excluded.window_start
           ELSE window_start
         END,
         count = CASE
           WHEN ? - CAST(window_start AS INTEGER) >= ? THEN 1
           ELSE count + 1
         END
       WHERE ? - CAST(window_start AS INTEGER) >= ?
          OR count < ?`,
    )
    .bind(key, now, now, windowSec, now, windowSec, now, windowSec, limit)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function isBlocked(
  d1: D1Database,
  key: string,
  limit: number,
  windowSec: number
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const row = await d1.prepare("SELECT window_start, count FROM rate_limits WHERE scope_key = ?").bind(key).first<{ window_start: string; count: number }>();
  if (!row) return false;
  const winStart = parseInt(row.window_start, 10);
  if (now - winStart >= windowSec) return false;
  return row.count >= limit;
}

export async function reset(d1: D1Database, key: string): Promise<void> {
  await d1.prepare("DELETE FROM rate_limits WHERE scope_key = ?").bind(key).run();
}
