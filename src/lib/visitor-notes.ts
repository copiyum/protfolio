import { z } from "zod";

export const VISITOR_NOTES_TAG = "visitor-notes";
export const VISITOR_NOTE_R2_PREFIX = "visitor-notes/";
export const MAX_VISITOR_NOTE_IMAGE_BYTES = 600 * 1024;
export const MAX_VISITOR_NOTE_IMAGE_WIDTH = 2048;
export const MAX_VISITOR_NOTE_IMAGE_HEIGHT = 1536;

const PNG_DATA_URL_PREFIX = "data:image/png;base64,";
const MAX_DATA_URL_CHARS = PNG_DATA_URL_PREFIX.length + Math.ceil(MAX_VISITOR_NOTE_IMAGE_BYTES / 3) * 4 + 8;

export const VISITOR_NOTE_COLORS = [
  "#f43f5e",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#a855f7",
  "#f97316",
  "#22d3ee",
  "#e5e7eb",
] as const;

const VisitorNoteSubmitSchema = z.object({
  name: z.string().max(200).optional().nullable(),
  message: z.string().max(500).optional().nullable(),
  color: z.enum(VISITOR_NOTE_COLORS),
  imageDataUrl: z.string().min(PNG_DATA_URL_PREFIX.length + 4).max(MAX_DATA_URL_CHARS),
  cfTurnstileResponse: z.string().min(1).max(2048),
});

export class VisitorNoteValidationError extends Error {}

export interface VisitorNote {
  id: string;
  x: number;
  y: number;
  rotation: number;
  color: string;
  imageUrl: string;
  name: string;
  message?: string;
  createdAt: number;
}

export interface AdminVisitorNote extends VisitorNote {
  imageWidth: number;
  imageHeight: number;
  imageBytes: number;
  createdAtIso: string;
}

interface VisitorNoteRow {
  id: string;
  r2_key: string;
  name: string;
  message: string | null;
  color: string;
  x: number;
  y: number;
  rotation: number;
  image_width: number;
  image_height: number;
  image_bytes: number;
  created_at: string;
}

export interface ParsedVisitorNoteSubmission {
  name: string;
  message?: string;
  color: string;
  image: {
    bytes: Uint8Array;
    width: number;
    height: number;
  };
  cfTurnstileResponse: string;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value * 1000) / 1000));
}

function randomPosition() {
  return {
    x: clampPercent(8 + Math.random() * 84),
    y: clampPercent(8 + Math.random() * 84),
  };
}

function randomRotation() {
  return Math.round((Math.random() * 8 - 4) * 10) / 10;
}

function normalizeText(value: string | null | undefined, maxLength: number): string {
  const normalized = (value ?? "")
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return Array.from(normalized).slice(0, maxLength).join("");
}

function decodedBase64Length(base64: string): number {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

function decodeBase64(base64: string): Uint8Array {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length % 4 === 1) {
    throw new VisitorNoteValidationError("Invalid PNG data");
  }
  if (decodedBase64Length(base64) > MAX_VISITOR_NOTE_IMAGE_BYTES) {
    throw new VisitorNoteValidationError("PNG is too large");
  }
  let binary = "";
  try {
    binary = atob(base64);
  } catch {
    throw new VisitorNoteValidationError("Invalid PNG data");
  }
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function parsePngDataUrl(dataUrl: string): { bytes: Uint8Array; width: number; height: number } {
  if (!dataUrl.startsWith(PNG_DATA_URL_PREFIX)) {
    throw new VisitorNoteValidationError("Only PNG drawings are accepted");
  }
  const bytes = decodeBase64(dataUrl.slice(PNG_DATA_URL_PREFIX.length));
  if (bytes.byteLength < 33) {
    throw new VisitorNoteValidationError("PNG is too small");
  }
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!signature.every((byte, index) => bytes[index] === byte)) {
    throw new VisitorNoteValidationError("Invalid PNG signature");
  }
  const chunkType = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
  if (chunkType !== "IHDR") {
    throw new VisitorNoteValidationError("Invalid PNG header");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  if (width < 1 || height < 1 || width > MAX_VISITOR_NOTE_IMAGE_WIDTH || height > MAX_VISITOR_NOTE_IMAGE_HEIGHT) {
    throw new VisitorNoteValidationError("PNG dimensions are out of bounds");
  }
  return { bytes, width, height };
}

export function parseVisitorNoteSubmission(input: unknown): ParsedVisitorNoteSubmission {
  const parsed = VisitorNoteSubmitSchema.parse(input);
  const name = normalizeText(parsed.name, 40) || "unknown";
  const message = normalizeText(parsed.message, 140) || undefined;
  return {
    name,
    message,
    color: parsed.color,
    image: parsePngDataUrl(parsed.imageDataUrl),
    cfTurnstileResponse: parsed.cfTurnstileResponse,
  };
}

export function isVisitorNoteId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

function imageUrl(id: string): string {
  return `/api/visitor-notes/${id}/image`;
}

function rowToPublicNote(row: VisitorNoteRow): VisitorNote {
  return {
    id: row.id,
    x: Number(row.x),
    y: Number(row.y),
    rotation: Number(row.rotation),
    color: row.color,
    imageUrl: imageUrl(row.id),
    name: row.name,
    message: row.message ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
  };
}

function rowToAdminNote(row: VisitorNoteRow): AdminVisitorNote {
  return {
    ...rowToPublicNote(row),
    imageWidth: row.image_width,
    imageHeight: row.image_height,
    imageBytes: row.image_bytes,
    createdAtIso: row.created_at,
  };
}

export async function listPublicVisitorNotes(db: D1Database, limit = 80): Promise<VisitorNote[]> {
  const safeLimit = Math.max(1, Math.min(120, Math.floor(limit)));
  const result = await db
    .prepare(
      `SELECT id, r2_key, name, message, color, x, y, rotation, image_width, image_height, image_bytes, created_at
       FROM (
         SELECT id, r2_key, name, message, color, x, y, rotation, image_width, image_height, image_bytes, created_at
         FROM visitor_notes
         ORDER BY created_at DESC
         LIMIT ?
       )
       ORDER BY created_at ASC`,
    )
    .bind(safeLimit)
    .all<VisitorNoteRow>();
  return (result.results ?? []).map(rowToPublicNote);
}

export async function listAdminVisitorNotes(db: D1Database, limit = 200): Promise<AdminVisitorNote[]> {
  const safeLimit = Math.max(1, Math.min(500, Math.floor(limit)));
  const result = await db
    .prepare(
      `SELECT id, r2_key, name, message, color, x, y, rotation, image_width, image_height, image_bytes, created_at
       FROM visitor_notes
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .bind(safeLimit)
    .all<VisitorNoteRow>();
  return (result.results ?? []).map(rowToAdminNote);
}

export async function getVisitorNoteStorage(db: D1Database, id: string): Promise<{ r2Key: string } | null> {
  if (!isVisitorNoteId(id)) return null;
  const row = await db
    .prepare("SELECT r2_key FROM visitor_notes WHERE id = ?")
    .bind(id)
    .first<{ r2_key: string }>();
  return row ? { r2Key: row.r2_key } : null;
}

export async function createVisitorNote(
  db: D1Database,
  r2: R2Bucket,
  submission: ParsedVisitorNoteSubmission,
): Promise<VisitorNote> {
  const id = crypto.randomUUID();
  const r2Key = `${VISITOR_NOTE_R2_PREFIX}${id}.png`;
  const position = randomPosition();
  const rotation = randomRotation();
  const createdAt = new Date().toISOString();

  await r2.put(r2Key, submission.image.bytes, {
    httpMetadata: { contentType: "image/png" },
    customMetadata: { visitorNoteId: id },
  });

  try {
    await db
      .prepare(
        `INSERT INTO visitor_notes
          (id, r2_key, name, message, color, x, y, rotation, image_width, image_height, image_bytes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        r2Key,
        submission.name,
        submission.message ?? null,
        submission.color,
        position.x,
        position.y,
        rotation,
        submission.image.width,
        submission.image.height,
        submission.image.bytes.byteLength,
        createdAt,
      )
      .run();
  } catch (error) {
    await r2.delete(r2Key).catch(() => {});
    throw error;
  }

  return {
    id,
    ...position,
    rotation,
    color: submission.color,
    imageUrl: imageUrl(id),
    name: submission.name,
    message: submission.message,
    createdAt: new Date(createdAt).getTime(),
  };
}
