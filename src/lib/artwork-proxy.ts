import { enforcePublicRateLimit, type PublicRateLimitEnv } from "@/lib/public-rate-limit";

const ALLOWED_ART_HOSTS = new Set(["lastfm.freetls.fastly.net"]);
const ARTWORK_LIMIT = 60;
const ARTWORK_WINDOW_SECONDS = 60;
const MAX_ARTWORK_BYTES = 5 * 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 5_000;
const MAX_REDIRECTS = 3;

function isAllowedArtworkUrl(url: URL): boolean {
  return url.protocol === "https:" && (
    url.hostname === "mzstatic.com"
    || url.hostname.endsWith(".mzstatic.com")
    || ALLOWED_ART_HOSTS.has(url.hostname)
  );
}

function detectRasterMime(bytes: Uint8Array): string | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (bytes.length >= 8 && bytes.slice(0, 8).every((byte, index) => byte === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index])) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (bytes.length >= 16 && ascii(4, 8) === "ftyp" && /avif|avis/.test(ascii(8, 16))) return "image/avif";
  return null;
}

async function readBodyWithLimit(response: Response): Promise<Uint8Array> {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_ARTWORK_BYTES) throw new Error("Artwork too large");
  if (!response.body) throw new Error("Artwork body missing");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_ARTWORK_BYTES) {
      await reader.cancel().catch(() => {});
      throw new Error("Artwork too large");
    }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

async function fetchArtwork(
  initial: URL,
  fetchImpl: typeof fetch,
): Promise<{ body: Uint8Array; contentType: string }> {
  let current = initial;
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect++) {
    if (!isAllowedArtworkUrl(current)) throw new Error("Artwork host not allowed");
    const response = await fetchImpl(current.toString(), {
      headers: { Accept: "image/avif,image/webp,image/png,image/jpeg" },
      redirect: "manual",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirect === MAX_REDIRECTS) throw new Error("Invalid artwork redirect");
      current = new URL(location, current);
      continue;
    }
    if (!response.ok) throw new Error("Artwork unavailable");
    const body = await readBodyWithLimit(response);
    const contentType = detectRasterMime(body);
    if (!contentType) throw new Error("Artwork response was not a supported image");
    return { body, contentType };
  }
  throw new Error("Too many artwork redirects");
}

export async function handleArtworkProxyGet(
  request: Request,
  env: PublicRateLimitEnv,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const limited = await enforcePublicRateLimit(request, env, "album-art", ARTWORK_LIMIT, ARTWORK_WINDOW_SECONDS);
  if (limited) return limited;

  const src = new URL(request.url).searchParams.get("src");
  if (!src) return new Response("Missing artwork URL", { status: 400 });
  let artworkUrl: URL;
  try {
    artworkUrl = new URL(src);
  } catch {
    return new Response("Invalid artwork URL", { status: 400 });
  }
  if (!isAllowedArtworkUrl(artworkUrl)) return new Response("Artwork host not allowed", { status: 400 });

  let body: Uint8Array;
  let contentType: string;
  try {
    ({ body, contentType } = await fetchArtwork(artworkUrl, fetchImpl));
  } catch {
    return new Response("Artwork unavailable", { status: 502 });
  }
  return new Response(body.slice().buffer as ArrayBuffer, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
