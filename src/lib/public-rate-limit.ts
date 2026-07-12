import { consume } from "@/lib/admin/ratelimit";
import { fingerprintIp, trustedClientIp } from "@/lib/security";

export interface PublicRateLimitEnv {
  DB?: D1Database;
  RATE_LIMIT_SECRET?: string;
  ADMIN_COOKIE_SECRET?: string;
}

function unavailable(): Response {
  return Response.json(
    { error: "Service temporarily unavailable" },
    { status: 503, headers: { "Retry-After": "30" } },
  );
}

export async function enforcePublicRateLimit(
  request: Request,
  env: PublicRateLimitEnv,
  scope: string,
  limit: number,
  windowSeconds: number,
): Promise<Response | null> {
  if (!env.DB) return unavailable();
  try {
    const ip = trustedClientIp(request.headers);
    const key = await fingerprintIp(ip, env.RATE_LIMIT_SECRET ?? env.ADMIN_COOKIE_SECRET);
    const ok = await consume(env.DB, `public-api:${scope}:${key}`, limit, windowSeconds);
    if (ok) return null;
    return Response.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(windowSeconds) } },
    );
  } catch {
    return unavailable();
  }
}
