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

const FALLBACK_ACCENT_COLOR = "#1db954";

async function getAlbumArt(artist: string, track: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(`${artist} ${track}`);
    const res = await fetch(
      `https://itunes.apple.com/search?term=${q}&entity=song&limit=1`,
      { next: { revalidate: 3600 } }
    );
    const data = (await res.json()) as {
      resultCount?: number;
      results?: Array<{ artworkUrl100?: string }>;
    };
    if (data.resultCount && data.resultCount > 0) {
      return data.results?.[0]?.artworkUrl100?.replace("100x100bb", "600x600bb") ?? null;
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
  const track = (Array.isArray(tracks) ? tracks[0] : tracks) as Record<string, any> | undefined;

  const playing = track?.["@attr"]?.nowplaying === "true";
  const title: string = track?.name ?? "";
  const artist: string = track?.artist?.["#text"] ?? "";
  const album: string = track?.album?.["#text"] ?? "";
  const lastPlayedAt: string | undefined = track?.date?.["#text"];

  const artUrl = await getAlbumArt(artist, title);

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