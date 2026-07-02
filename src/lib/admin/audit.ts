import { randomUUID } from "node:crypto";

export interface AuditInput {
  action: string;
  targetTable?: string;
  targetId?: string;
  actorCredentialId?: string;
  ip?: string;
  ua?: string;
  diff?: Record<string, unknown>;
}

export async function writeAudit(d1: D1Database, input: AuditInput): Promise<string> {
  const id = randomUUID();
  await d1
    .prepare(
      `INSERT INTO audit_log (id, actor_credential_id, action, target_table, target_id, ip, ua, diff)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      input.actorCredentialId ?? null,
      input.action,
      input.targetTable ?? null,
      input.targetId ?? null,
      input.ip ?? null,
      input.ua ?? null,
      input.diff ? JSON.stringify(input.diff) : null
    )
    .run();
  return id;
}