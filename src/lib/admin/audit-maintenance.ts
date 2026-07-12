import { alert } from "./alerts";

const AUDIT_RETENTION_DAYS = 90;
const RATE_LIMIT_RETENTION_SECONDS = 2 * 24 * 60 * 60;
const STATUS_KEY = "audit/status/last-success.json";

export interface AuditMaintenanceEnv {
  DB: D1Database;
  R2: R2Bucket;
  ALERT_EMAIL_WEBHOOK?: string;
}

export interface AuditMaintenanceResult {
  archiveKey: string;
  archivedRows: number;
  expiredAuditRows: number;
  expiredSessions: number;
  expiredRateLimits: number;
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function previousSuccess(env: AuditMaintenanceEnv): Promise<Date | null> {
  const object = await env.R2.get(STATUS_KEY);
  if (!object) return null;
  try {
    const payload = await object.json<{ completedAt?: string }>();
    const date = payload.completedAt ? new Date(payload.completedAt) : null;
    return date && Number.isFinite(date.getTime()) ? date : null;
  } catch {
    return null;
  }
}

export async function runAuditMaintenance(
  env: AuditMaintenanceEnv,
  now = new Date(),
): Promise<AuditMaintenanceResult> {
  const prior = await previousSuccess(env);
  if (prior && now.getTime() - prior.getTime() > 48 * 60 * 60 * 1000) {
    await alert(
      env,
      "Audit snapshot schedule gap",
      `Last successful snapshot was ${prior.toISOString()}; current run is ${now.toISOString()}`,
    );
  }
  const archiveFrom = prior ?? new Date(now.getTime() - AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const rows = await env.DB.prepare(
    `SELECT id, actor_credential_id, action, target_table, target_id, ip, ua, ts, diff
     FROM audit_log
     WHERE julianday(ts) > julianday(?)
       AND julianday(ts) <= julianday(?)
     ORDER BY ts, id`,
  ).bind(archiveFrom.toISOString(), now.toISOString()).all<Record<string, unknown>>();

  const jsonl = (rows.results ?? []).map((row) => JSON.stringify(row)).join("\n");
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(jsonl)));
  const digestHex = hex(digest);
  const timestamp = now.toISOString().replace(/[:.]/g, "-");
  const archiveKey = `audit/${now.toISOString().slice(0, 10)}/${timestamp}-${digestHex.slice(0, 16)}.jsonl.gz`;
  const gzip = new Uint8Array(
    await new Response(
      new Blob([jsonl]).stream().pipeThrough(new CompressionStream("gzip")),
    ).arrayBuffer(),
  );

  await env.R2.put(archiveKey, gzip, {
    httpMetadata: { contentType: "application/gzip" },
    customMetadata: {
      sha256: digestHex,
      rows: String(rows.results?.length ?? 0),
      completedAt: now.toISOString(),
      archiveFrom: archiveFrom.toISOString(),
    },
  });

  const retentionEpoch = Math.floor(now.getTime() / 1000) - RATE_LIMIT_RETENTION_SECONDS;
  const [sessions, rateLimits, auditRows] = await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE julianday(expires_at) < julianday(?)").bind(now.toISOString()),
    env.DB.prepare("DELETE FROM rate_limits WHERE CAST(window_start AS INTEGER) < ?").bind(retentionEpoch),
    env.DB.prepare(`DELETE FROM audit_log WHERE julianday(ts) < julianday(?, '-${AUDIT_RETENTION_DAYS} days')`).bind(now.toISOString()),
  ]);

  const result: AuditMaintenanceResult = {
    archiveKey,
    archivedRows: rows.results?.length ?? 0,
    expiredSessions: sessions.meta.changes ?? 0,
    expiredRateLimits: rateLimits.meta.changes ?? 0,
    expiredAuditRows: auditRows.meta.changes ?? 0,
  };

  await env.R2.put(STATUS_KEY, JSON.stringify({ completedAt: now.toISOString(), ...result }), {
    httpMetadata: { contentType: "application/json" },
  });
  return result;
}
