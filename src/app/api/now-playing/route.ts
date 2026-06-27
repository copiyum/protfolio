import { NextResponse } from "next/server";
import sharp from "sharp";

export interface NowPlayingData {
  playing: boolean;
  title: string;
  artist: string;
  album: string;
  artUrl: string | null;
  accentColor: string;
  lastPlayedAt?: string;
}

const FALLBACK_ACCENT_COLOR = "#1db954";
const SAMPLE_SIZE = 48;

function saturationFor(r: number, g: number, b: number) {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  return max === 0 ? 0 : (max - min) / max;
}

function luminanceFor(r: number, g: number, b: number) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function pickDominantColor(data: Buffer) {
  const buckets = new Map<string, { r: number; g: number; b: number; count: number; score: number }>();

  for (let i = 0; i < data.length; i += 16) {
    const alpha = data[i + 3];
    if (alpha === undefined || alpha < 180) continue;

    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const saturation = saturationFor(r, g, b);
    const luminance = luminanceFor(r, g, b);

    if (saturation < 0.16 || luminance < 0.08 || luminance > 0.92) continue;

    const qr = Math.round(r / 24) * 24;
    const qg = Math.round(g / 24) * 24;
    const qb = Math.round(b / 24) * 24;
    const key = `${qr},${qg},${qb}`;
    const score = (1 + saturation) * (0.85 + Math.abs(luminance - 0.5));
    const bucket = buckets.get(key);

    if (bucket) {
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      bucket.count += 1;
      bucket.score += score;
    } else {
      buckets.set(key, { r, g, b, count: 1, score });
    }
  }

  let best: { r: number; g: number; b: number; count: number; score: number } | undefined;
  for (const bucket of buckets.values()) {
    if (!best || bucket.score > best.score) best = bucket;
  }
  if (!best) return FALLBACK_ACCENT_COLOR;

  const r = Math.round(best.r / best.count);
  const g = Math.round(best.g / best.count);
  const b = Math.round(best.b / best.count);
  return `rgb(${r} ${g} ${b})`;
}

async function getAlbumArt(artist: string, track: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(`${artist} ${track}`);
    const res = await fetch(
      `https://itunes.apple.com/search?term=${q}&entity=song&limit=1`,
      { next: { revalidate: 3600 } }
    );
    const data = await res.json();
    if (data.resultCount > 0) {
      return data.results[0].artworkUrl100.replace("100x100bb", "600x600bb");
    }
  } catch {
    // iTunes unavailable — fall back to null
  }
  return null;
}

async function getAlbumAccentColor(artUrl: string | null): Promise<string> {
  if (!artUrl) return FALLBACK_ACCENT_COLOR;

  try {
    const res = await fetch(artUrl, { next: { revalidate: 3600 } });
    if (!res.ok) return FALLBACK_ACCENT_COLOR;

    const input = Buffer.from(await res.arrayBuffer());
    const data = await sharp(input)
      .resize(SAMPLE_SIZE, SAMPLE_SIZE, { fit: "cover" })
      .ensureAlpha()
      .raw()
      .toBuffer();

    return pickDominantColor(data);
  } catch {
    return FALLBACK_ACCENT_COLOR;
  }
}

export async function GET() {
  const apiKey = process.env.LASTFM_API_KEY;
  const username = process.env.LASTFM_USERNAME;

  if (!apiKey || !username) {
    return NextResponse.json({ error: "Missing Last.fm config" }, { status: 500 });
  }

  const res = await fetch(
    `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${apiKey}&format=json&limit=1`,
    { next: { revalidate: 30 } }
  );

  const data = await res.json();

  if (data.error) {
    return NextResponse.json({ error: data.message }, { status: 502 });
  }

  const tracks = data.recenttracks.track;
  const track = Array.isArray(tracks) ? tracks[0] : tracks;

  const playing = track?.["@attr"]?.nowplaying === "true";
  const title: string = track?.name ?? "";
  const artist: string = track?.artist?.["#text"] ?? "";
  const album: string = track?.album?.["#text"] ?? "";
  const lastPlayedAt: string | undefined = track?.date?.["#text"];

  const artUrl = await getAlbumArt(artist, title);
  const accentColor = await getAlbumAccentColor(artUrl);

  const payload: NowPlayingData = { playing, title, artist, album, artUrl, accentColor, lastPlayedAt };
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
  });
}
