import { getCloudflareContext } from "@opennextjs/cloudflare";

interface TurnstileRuntimeEnv {
  NEXT_PUBLIC_TURNSTILE_SITEKEY?: string;
}

export async function getTurnstileSiteKey(): Promise<string> {
  try {
    const ctx = await getCloudflareContext({ async: true });
    const sitekey = (ctx.env as unknown as TurnstileRuntimeEnv).NEXT_PUBLIC_TURNSTILE_SITEKEY;
    if (sitekey) return sitekey;
  } catch {
    // Local Next.js dev/test environments may not have a Cloudflare context.
  }
  return process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY ?? "";
}
