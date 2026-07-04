const ALLOWED_ART_HOSTS = new Set([
  "lastfm.freetls.fastly.net",
]);

function isAllowedArtworkUrl(url: URL): boolean {
  if (url.protocol !== "https:") return false;
  return (
    url.hostname === "mzstatic.com" ||
    url.hostname.endsWith(".mzstatic.com") ||
    ALLOWED_ART_HOSTS.has(url.hostname)
  );
}

export async function GET(request: Request) {
  const src = new URL(request.url).searchParams.get("src");
  if (!src) return new Response("Missing artwork URL", { status: 400 });

  let artworkUrl: URL;
  try {
    artworkUrl = new URL(src);
  } catch {
    return new Response("Invalid artwork URL", { status: 400 });
  }

  if (!isAllowedArtworkUrl(artworkUrl)) {
    return new Response("Artwork host not allowed", { status: 400 });
  }

  const upstream = await fetch(artworkUrl.toString(), {
    headers: { Accept: "image/avif,image/webp,image/*,*/*;q=0.8" },
  });
  if (!upstream.ok || !upstream.body) {
    return new Response("Artwork unavailable", { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    return new Response("Artwork response was not an image", { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
    },
  });
}
