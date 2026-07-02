import { createHmac } from "node:crypto";

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

export async function presignPut(key: string, secret: string, ttlSec = 300): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const sig = createHmac("sha256", secret).update(`${key}:${exp}`).digest("base64url");
  return `/api/r2/put?key=${encodeURIComponent(key)}&exp=${exp}&sig=${sig}`;
}

export function verifySig(key: string, exp: string, sig: string, secret: string): boolean {
  if (parseInt(exp) < Math.floor(Date.now() / 1000)) return false;
  const expected = createHmac("sha256", secret).update(`${key}:${exp}`).digest("base64url");
  return sig === expected;
}