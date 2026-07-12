import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { enforcePublicRateLimit, type PublicRateLimitEnv } from "@/lib/public-rate-limit";

export interface NowPlayingData {
  playing: boolean;
  title: string;
  artist: string;
  album: string;
  artUrl: string | null;
  accentColor: string;
  lastPlayedAt?: string;
}

interface LastFmImage {
  "#text"?: string;
}

interface LastFmTrack {
  "@attr"?: { nowplaying?: string };
  name?: string;
  artist?: { "#text"?: string };
  album?: { "#text"?: string };
  date?: { "#text"?: string };
  image?: LastFmImage[];
}

const FALLBACK_ACCENT_COLOR = "#1db954";
const ART_PROXY_PATH = "/api/now-playing/art";
const PUBLIC_API_LIMIT = 120;
const PUBLIC_API_WINDOW_SEC = 60;
const ALBUM_ART_CACHE_TTL_SEC = 7 * 24 * 60 * 60;

async function getPublicApiEnv(): Promise<PublicRateLimitEnv> {
  try {
    const ctx = await getCloudflareContext({ async: true });
    return ctx.env as unknown as PublicRateLimitEnv;
  } catch {
    return {};
  }
}

function upgradeItunesArtworkUrl(raw: string): string {
  // iTunes returns URLs in a couple of shapes depending on CDN/age:
  //   .../100x100bb.jpg   (older)
  //   .../100x100.jpg     (newer, no bounding-box modifier)
  // The `bb` suffix asks the CDN to crop-to-square. If it's present we can
  // upgrade to a higher-res variant; otherwise use the URL as-is.
  if (raw.includes("100x100bb")) return raw.replace("100x100bb", "600x600bb");
  return raw;
}

function proxiedArtworkUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    return `${ART_PROXY_PATH}?src=${encodeURIComponent(url.toString())}`;
  } catch {
    return null;
  }
}

function cleanTrackTitle(track: string): string {
  return track
    .replace(/\s*\([^)]*(?:from|feat\.?|with|remaster(?:ed)?|live|edit|version)[^)]*\)\s*/gi, " ")
    .replace(/\s+-\s*(?:from|feat\.?|with|remaster(?:ed)?|live|edit|version).*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function albumArtCacheKey(artist: string, track: string): string {
  return `${artist} ${cleanTrackTitle(track)}`.toLowerCase().replace(/\s+/g, " ").trim();
}

function getLastFmAlbumArt(track: LastFmTrack | undefined): string | null {
  const images = Array.isArray(track?.image) ? track.image : [];
  for (const image of [...images].reverse()) {
    const raw = typeof image?.["#text"] === "string" ? image["#text"] : "";
    if (!raw || raw.includes("2a96cbd8b46e442fc41c2b86b821562f")) continue;
    const proxied = proxiedArtworkUrl(raw);
    if (proxied) return proxied;
  }
  return null;
}

async function readCachedAlbumArt(db: D1Database | null, cacheKey: string) {
  if (!db || !cacheKey) return null;
  try {
    const row = await db
      .prepare("SELECT art_url, created_at FROM album_art_cache WHERE cache_key = ?")
      .bind(cacheKey)
      .first<{ art_url: string | null; created_at: number }>();
    if (!row) return null;
    return {
      artUrl: row.art_url,
      fresh: Math.floor(Date.now() / 1000) - row.created_at < ALBUM_ART_CACHE_TTL_SEC,
    };
  } catch {
    return null;
  }
}

async function writeCachedAlbumArt(db: D1Database | null, cacheKey: string, artUrl: string | null) {
  if (!db || !cacheKey) return;
  try {
    await db
      .prepare(
        `INSERT INTO album_art_cache (cache_key, art_url, created_at)
         VALUES (?, ?, ?)
         ON CONFLICT(cache_key) DO UPDATE SET
           art_url = excluded.art_url,
           created_at = excluded.created_at`,
      )
      .bind(cacheKey, artUrl, Math.floor(Date.now() / 1000))
      .run();
  } catch {
    // Cache writes are best-effort; the music payload should not fail because of them.
  }
}

async function searchItunesAlbumArt(artist: string, track: string): Promise<string | null> {
  const queries = Array.from(new Set([
    `${artist} ${track}`,
    `${artist} ${cleanTrackTitle(track)}`,
    track,
  ].map((q) => q.trim()).filter(Boolean)));

  try {
    for (const query of queries) {
      const q = encodeURIComponent(query);
      const res = await fetch(
        `https://itunes.apple.com/search?term=${q}&entity=song&limit=3`,
        { next: { revalidate: ALBUM_ART_CACHE_TTL_SEC } },
      );
      const data = (await res.json()) as {
        resultCount?: number;
        results?: Array<{ artworkUrl100?: string }>;
      };
      if (data.resultCount && data.resultCount > 0) {
        const raw = data.results?.find((result) => result.artworkUrl100)?.artworkUrl100;
        const proxied = proxiedArtworkUrl(raw ? upgradeItunesArtworkUrl(raw) : null);
        if (proxied) return proxied;
      }
    }
  } catch {
    // iTunes unavailable — fall back to null
  }
  return null;
}

async function getAlbumArt(db: D1Database | null, artist: string, track: string): Promise<string | null> {
  const cacheKey = albumArtCacheKey(artist, track);
  const cached = await readCachedAlbumArt(db, cacheKey);
  if (cached?.fresh) return cached.artUrl;

  const artUrl = await searchItunesAlbumArt(artist, track);
  await writeCachedAlbumArt(db, cacheKey, artUrl);
  return artUrl ?? cached?.artUrl ?? null;
}

export async function GET(request: Request) {
  const env = await getPublicApiEnv();
  const limited = await enforcePublicRateLimit(request, env, "now-playing", PUBLIC_API_LIMIT, PUBLIC_API_WINDOW_SEC);
  if (limited) return limited;
  const db = env.DB ?? null;

  const apiKey = process.env.LASTFM_API_KEY;
  const username = process.env.LASTFM_USERNAME;

  if (!apiKey || !username) {
    return NextResponse.json({ error: "Missing Last.fm config" }, { status: 500 });
  }

  const res = await fetch(
    `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${apiKey}&format=json&limit=1`,
    { next: { revalidate: 30 } }
  );

  const data = (await res.json()) as {
    error?: number;
    message?: string;
    recenttracks?: { track?: unknown };
  };

  if (data.error) {
    return NextResponse.json({ error: data.message }, { status: 502 });
  }

  const tracks = (data.recenttracks?.track ?? []) as unknown[];
  const track = (Array.isArray(tracks) ? tracks[0] : tracks) as LastFmTrack | undefined;

  const playing = track?.["@attr"]?.nowplaying === "true";
  const title: string = track?.name ?? "";
  const artist: string = track?.artist?.["#text"] ?? "";
  const album: string = track?.album?.["#text"] ?? "";
  const lastPlayedAt: string | undefined = track?.date?.["#text"];

  const artUrl = getLastFmAlbumArt(track) ?? await getAlbumArt(db, artist, title);

  const payload: NowPlayingData = {
    playing,
    title,
    artist,
    album,
    artUrl,
    accentColor: FALLBACK_ACCENT_COLOR,
    lastPlayedAt,
  };
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
  });
}
