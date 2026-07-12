import { getCloudflareContext } from "@opennextjs/cloudflare";
import { handleArtworkProxyGet } from "@/lib/artwork-proxy";
import type { PublicRateLimitEnv } from "@/lib/public-rate-limit";

export async function GET(request: Request) {
  let env: PublicRateLimitEnv = {};
  try {
    const context = await getCloudflareContext({ async: true });
    env = context.env as unknown as PublicRateLimitEnv;
  } catch {}
  return handleArtworkProxyGet(request, env);
}
