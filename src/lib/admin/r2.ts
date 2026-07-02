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

function bytes(input: ArrayBuffer | Uint8Array): Uint8Array {
  return input instanceof Uint8Array ? input : new Uint8Array(input);
}

function ascii(data: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...data.slice(start, end));
}

function assertMaxDimensions(dim: { width: number; height: number } | null): void {
  if (!dim) throw new UploadValidationError("Could not read image dimensions");
  if (dim.width < 1 || dim.height < 1 || dim.width > MAX_DIM || dim.height > MAX_DIM) {
    throw new UploadValidationError(`Image dimensions out of bounds: ${dim.width}x${dim.height}`);
  }
}

function pngDimensions(data: Uint8Array): { width: number; height: number } | null {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (data.length < 24 || !signature.every((b, i) => data[i] === b)) return null;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function jpegDimensions(data: Uint8Array): { width: number; height: number } | null {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) return null;
  let i = 2;
  while (i + 8 < data.length) {
    while (data[i] === 0xff) i++;
    const marker = data[i++];
    if (marker === 0xd9 || marker === 0xda) break;
    const length = (data[i] << 8) | data[i + 1];
    if (length < 2 || i + length > data.length) return null;
    const isSof = (marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf);
    if (isSof) {
      return {
        height: (data[i + 3] << 8) | data[i + 4],
        width: (data[i + 5] << 8) | data[i + 6],
      };
    }
    i += length;
  }
  return null;
}

function webpDimensions(data: Uint8Array): { width: number; height: number } | null {
  if (data.length < 16 || ascii(data, 0, 4) !== "RIFF" || ascii(data, 8, 12) !== "WEBP") return null;
  const chunk = ascii(data, 12, 16);
  if (chunk === "VP8X" && data.length >= 30) {
    return {
      width: 1 + data[24] + (data[25] << 8) + (data[26] << 16),
      height: 1 + data[27] + (data[28] << 8) + (data[29] << 16),
    };
  }
  if (chunk === "VP8L" && data.length >= 25 && data[20] === 0x2f) {
    return {
      width: 1 + (((data[22] & 0x3f) << 8) | data[21]),
      height: 1 + (((data[24] & 0x0f) << 10) | (data[23] << 2) | ((data[22] & 0xc0) >> 6)),
    };
  }
  if (chunk === "VP8 " && data.length >= 30 && data[23] === 0x9d && data[24] === 0x01 && data[25] === 0x2a) {
    return {
      width: ((data[27] << 8) | data[26]) & 0x3fff,
      height: ((data[29] << 8) | data[28]) & 0x3fff,
    };
  }
  return null;
}

function assertAvif(data: Uint8Array): void {
  if (data.length < 16 || ascii(data, 4, 8) !== "ftyp") throw new UploadValidationError("Invalid AVIF");
  const brands = ascii(data, 8, Math.min(data.length, 32));
  if (!brands.includes("avif") && !brands.includes("avis")) throw new UploadValidationError("Invalid AVIF");
}

export function validateObjectKey(key: string): void {
  if (!/^uploads\/[A-Za-z0-9][A-Za-z0-9._/-]{0,180}$/.test(key) || key.includes("..") || key.includes("//") || key.endsWith("/")) {
    throw new UploadValidationError("Invalid object key");
  }
}

export function validateImage(mime: string, size: number, body?: ArrayBuffer | Uint8Array): string {
  const ext = extFromMime(mime);
  if (!ext) throw new UploadValidationError(`Unsupported MIME: ${mime}`);
  if (!ALLOWED.has(ext)) throw new UploadValidationError(`Disallowed extension: ${ext}`);
  if (size > MAX_BYTES) throw new UploadValidationError(`File too large: ${size}`);
  if (body) {
    const data = bytes(body);
    if (ext === "png") assertMaxDimensions(pngDimensions(data));
    if (ext === "jpg") assertMaxDimensions(jpegDimensions(data));
    if (ext === "webp") assertMaxDimensions(webpDimensions(data));
    if (ext === "avif") assertAvif(data);
  }
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
  validateObjectKey(key);
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const mac = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(`${key}:${exp}`));
  const sig = b64url(new Uint8Array(mac));
  return `/api/r2/put?key=${encodeURIComponent(key)}&exp=${exp}&sig=${sig}`;
}

export async function verifySig(key: string, exp: string, sig: string, secret: string): Promise<boolean> {
  try { validateObjectKey(key); } catch { return false; }
  const expNum = Number(exp);
  if (!Number.isInteger(expNum) || expNum < Math.floor(Date.now() / 1000)) return false;
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
