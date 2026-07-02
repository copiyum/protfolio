import { NextResponse } from "next/server";

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

async function getAlbumArt(artist: string, track: string): Promise<string | null> {
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
        { cache: "no-store" }
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

  const artUrl = getLastFmAlbumArt(track) ?? await getAlbumArt(artist, title);

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
