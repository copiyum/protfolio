import { consume } from "@/lib/admin/ratelimit";
import { verifyTurnstile } from "@/lib/admin/turnstile";
import {
  VisitorNoteValidationError,
  createVisitorNote,
  getVisitorNoteStorage,
  listPublicVisitorNotes,
  parseVisitorNoteSubmission,
} from "@/lib/visitor-notes";

export interface VisitorNotesEnv {
  DB: D1Database;
  R2: R2Bucket;
  TURNSTILE_SECRET?: string;
}

type VerifyTurnstile = typeof verifyTurnstile;
type ConsumeRateLimit = typeof consume;

export interface VisitorNotesApiDeps {
  verifyTurnstile?: VerifyTurnstile;
  consume?: ConsumeRateLimit;
}

const MAX_JSON_BODY_BYTES = 850 * 1024;
const PREFLIGHT_LIMIT = 30;
const PREFLIGHT_WINDOW_SEC = 60;
const SUBMIT_LIMIT = 5;
const SUBMIT_WINDOW_SEC = 60 * 60;

function json(body: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(JSON.stringify(body), { ...init, headers });
}

function clientIp(request: Request): string {
  return request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";
}

function requestHostname(request: Request): string | null {
  try {
    return new URL(request.url).hostname;
  } catch {
    return null;
  }
}

function isSameOriginPost(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const requestUrl = new URL(request.url);
    return new URL(origin).host === requestUrl.host;
  } catch {
    return false;
  }
}

async function readTextWithLimit(request: Request, maxBytes: number): Promise<string> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxBytes) {
    throw new VisitorNoteValidationError("Request body is too large");
  }
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new VisitorNoteValidationError("Request body is too large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

async function readJsonWithLimit(request: Request): Promise<unknown> {
  const text = await readTextWithLimit(request, MAX_JSON_BODY_BYTES);
  if (!text) throw new VisitorNoteValidationError("Missing request body");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new VisitorNoteValidationError("Invalid JSON");
  }
}

export async function handleVisitorNotesGet(_request: Request, env: VisitorNotesEnv): Promise<Response> {
  const notes = await listPublicVisitorNotes(env.DB);
  return json({ notes });
}

export async function handleVisitorNotesPost(
  request: Request,
  env: VisitorNotesEnv,
  deps: VisitorNotesApiDeps = {},
): Promise<Response> {
  const verify = deps.verifyTurnstile ?? verifyTurnstile;
  const limit = deps.consume ?? consume;

  if (!isSameOriginPost(request)) {
    return json({ error: "Bad origin" }, { status: 403 });
  }
  if (request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") {
    return json({ error: "Expected JSON" }, { status: 415 });
  }
  if (!env.TURNSTILE_SECRET) {
    return json({ error: "Turnstile is not configured" }, { status: 503 });
  }

  const ip = clientIp(request);
  const preflightOk = await limit(env.DB, `visitor-note-pre:${ip}`, PREFLIGHT_LIMIT, PREFLIGHT_WINDOW_SEC);
  if (!preflightOk) {
    return json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(PREFLIGHT_WINDOW_SEC) } });
  }

  let submission;
  try {
    submission = parseVisitorNoteSubmission(await readJsonWithLimit(request));
  } catch (error) {
    const invalid = error instanceof VisitorNoteValidationError || error instanceof Error;
    return json({ error: invalid ? "Invalid note" : "Bad request" }, { status: 400 });
  }

  const hostname = requestHostname(request);
  const turnstile = await verify(submission.cfTurnstileResponse, ip, env.TURNSTILE_SECRET, {
    action: "visitor-note",
    hostname,
  });
  if (!turnstile.ok) {
    return json({ error: "Human verification failed" }, { status: 403 });
  }

  const submitOk = await limit(env.DB, `visitor-note-submit:${ip}`, SUBMIT_LIMIT, SUBMIT_WINDOW_SEC);
  if (!submitOk) {
    return json({ error: "Too many submissions" }, { status: 429, headers: { "Retry-After": String(SUBMIT_WINDOW_SEC) } });
  }

  try {
    const note = await createVisitorNote(env.DB, env.R2, submission);
    return json({ note }, { status: 201 });
  } catch {
    return json({ error: "Could not save note" }, { status: 500 });
  }
}

export async function handleVisitorNoteImageGet(_request: Request, env: VisitorNotesEnv, id: string): Promise<Response> {
  const storage = await getVisitorNoteStorage(env.DB, id);
  if (!storage) return new Response("Not found", { status: 404 });
  const object = await env.R2.get(storage.r2Key);
  if (!object?.body) return new Response("Not found", { status: 404 });
  return new Response(object.body, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "image/png",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
