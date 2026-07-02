export interface SessionPayload {
  credentialId: string;
  expiresAt: string;
  nonce: string;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64urlEncode(buf: ArrayBuffer | Uint8Array | string): string {
  const bytes = typeof buf === "string" ? enc.encode(buf) : new Uint8Array(buf instanceof Uint8Array ? buf.buffer : buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s: string): Uint8Array {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signSession(p: SessionPayload, secret: string): Promise<string> {
  const body = b64urlEncode(JSON.stringify(p));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return `${body}.${b64urlEncode(sig)}`;
}

export async function verifySession(cookie: string, secret: string): Promise<SessionPayload | null> {
  const [body, mac] = cookie.split(".");
  if (!body || !mac) return null;
  const key = await hmacKey(secret);
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
  if (new Date(payload.expiresAt).getTime() < Date.now()) return null;
  return payload;
}