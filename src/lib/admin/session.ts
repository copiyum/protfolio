import { adminTextEncoder as enc, b64urlDecode, b64urlEncode, hmacKey } from "./crypto";

export interface SessionPayload {
  sessionId?: string;
  credentialId: string;
  expiresAt: string;
  nonce: string;
  freshAt?: number;
}

const dec = new TextDecoder();

export async function signSession(p: SessionPayload, secret: string): Promise<string> {
  const body = b64urlEncode(JSON.stringify(p));
  const key = await hmacKey(secret, ["sign", "verify"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return `${body}.${b64urlEncode(sig)}`;
}

export async function verifySession(cookie: string, secret: string): Promise<SessionPayload | null> {
  const [body, mac] = cookie.split(".");
  if (!body || !mac) return null;
  const key = await hmacKey(secret, ["sign", "verify"]);
  const expected = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(body)));
  let given: Uint8Array;
  try { given = b64urlDecode(mac); } catch { return null; }
  if (expected.length !== given.length) return null;
  // constant-time compare
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ given[i];
  if (diff !== 0) return null;
  let payload: SessionPayload;
  try { payload = JSON.parse(dec.decode(b64urlDecode(body))); } catch { return null; }
  if (typeof payload.credentialId !== "string" || typeof payload.expiresAt !== "string" || typeof payload.nonce !== "string") return null;
  if (payload.sessionId !== undefined && typeof payload.sessionId !== "string") return null;
  if (payload.freshAt !== undefined && typeof payload.freshAt !== "number") return null;
  if (new Date(payload.expiresAt).getTime() < Date.now()) return null;
  return payload;
}

export async function verifyStoredSession(d1: D1Database, session: SessionPayload): Promise<boolean> {
  if (!session.sessionId) return false;
  const row = await d1
    .prepare(
      `SELECT s.passkey_credential_id, s.expires_at, p.credential_id AS active_credential_id
       FROM sessions s
       LEFT JOIN passkeys p ON p.credential_id = s.passkey_credential_id
       WHERE s.id = ?`,
    )
    .bind(session.sessionId)
    .first<{ passkey_credential_id: string; expires_at: string; active_credential_id: string | null }>();
  if (!row || !row.active_credential_id) return false;
  if (row.passkey_credential_id !== session.credentialId) return false;
  if (new Date(row.expires_at).getTime() < Date.now()) return false;
  return true;
}

export async function renewStoredSession(d1: D1Database, sessionId: string, expiresAt: string): Promise<void> {
  await d1.prepare("UPDATE sessions SET expires_at = ? WHERE id = ?").bind(expiresAt, sessionId).run();
}
