import { createHmac, timingSafeEqual } from "node:crypto";

export interface SessionPayload {
  credentialId: string;
  expiresAt: string;
  nonce: string;
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export async function signSession(p: SessionPayload, secret: string): Promise<string> {
  const body = b64url(JSON.stringify(p));
  const mac = b64url(createHmac("sha256", secret).update(body).digest());
  return `${body}.${mac}`;
}

export async function verifySession(cookie: string, secret: string): Promise<SessionPayload | null> {
  const [body, mac] = cookie.split(".");
  if (!body || !mac) return null;
  const expected = createHmac("sha256", secret).update(body).digest();
  let given: Buffer;
  try { given = fromB64url(mac); } catch { return null; }
  if (expected.length !== given.length) return null;
  if (!timingSafeEqual(expected, given)) return null;
  let payload: SessionPayload;
  try { payload = JSON.parse(fromB64url(body).toString("utf8")); } catch { return null; }
  if (new Date(payload.expiresAt).getTime() < Date.now()) return null;
  return payload;
}