import { z } from "zod";

export const MAX_BLOG_ASSET_BYTES = 5 * 1024 * 1024;
export const BlogPostIdSchema = z.string().min(1).max(120).regex(/^[a-zA-Z0-9_-]+$/);
export const BlogAssetInputSchema = z.object({ postId: BlogPostIdSchema, altText: z.string().trim().min(1).max(500) });

export type DetectedImage = { mimeType: "image/png" | "image/jpeg" | "image/webp" | "image/avif"; width?: number; height?: number; extension: "png" | "jpg" | "webp" | "avif" };

function u16(bytes: Uint8Array, offset: number) { return (bytes[offset] << 8) | bytes[offset + 1]; }
function u32(bytes: Uint8Array, offset: number) { return ((bytes[offset] << 24) >>> 0) + (bytes[offset + 1] << 16) + (bytes[offset + 2] << 8) + bytes[offset + 3]; }

function parseJpeg(bytes: Uint8Array): DetectedImage | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1]; offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    const length = u16(bytes, offset); if (length < 2 || offset + length > bytes.length) return null;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { mimeType: "image/jpeg", extension: "jpg", width: u16(bytes, offset + 5), height: u16(bytes, offset + 3) };
    }
    offset += length;
  }
  return null;
}

export function detectBlogImage(bytes: Uint8Array): DetectedImage | null {
  if (bytes.length >= 24 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte)) {
    return { mimeType: "image/png", extension: "png", width: u32(bytes, 16), height: u32(bytes, 20) };
  }
  const jpeg = parseJpeg(bytes); if (jpeg) return jpeg;
  if (bytes.length >= 30 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") {
    const chunk = String.fromCharCode(...bytes.slice(12, 16));
    if (chunk === "VP8X") return { mimeType: "image/webp", extension: "webp", width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16), height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16) };
    return { mimeType: "image/webp", extension: "webp" };
  }
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(4, 8)) === "ftyp") {
    const brand = String.fromCharCode(...bytes.slice(8, 12));
    if (brand === "avif" || brand === "avis") return { mimeType: "image/avif", extension: "avif" };
  }
  return null;
}

export function isSafeBlogAssetId(id: string): boolean { return z.string().uuid().safeParse(id).success; }
