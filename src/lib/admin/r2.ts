const enc = new TextEncoder();

const ALLOWED = new Set(["jpg", "png", "webp", "avif"]);
export const MAX_BYTES = 10 * 1024 * 1024;
export const MAX_DIM = 4096;

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export function extFromMime(mime: string): string {
  return MIME_TO_EXT[mime] ?? "";
}

export class UploadValidationError extends Error {}

export function validateImage(mime: string, size: number): string {
  const ext = extFromMime(mime);
  if (!ext) throw new UploadValidationError(`Unsupported MIME: ${mime}`);
  if (!ALLOWED.has(ext)) throw new UploadValidationError(`Disallowed extension: ${ext}`);
  if (size > MAX_BYTES) throw new UploadValidationError(`File too large: ${size}`);
  return ext;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

export async function presignPut(key: string, secret: string, ttlSec = 300): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const mac = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(`${key}:${exp}`));
  const sig = b64url(new Uint8Array(mac));
  return `/api/r2/put?key=${encodeURIComponent(key)}&exp=${exp}&sig=${sig}`;
}

export async function verifySig(key: string, exp: string, sig: string, secret: string): Promise<boolean> {
  if (parseInt(exp) < Math.floor(Date.now() / 1000)) return false;
  const expected = new Uint8Array(
    await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(`${key}:${exp}`))
  );
  let given: Uint8Array;
  try { given = b64urlDecode(sig); } catch { return false; }
  if (expected.length !== given.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ given[i];
  return diff === 0;
}

function b64url(buf: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s: string): Uint8Array {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}