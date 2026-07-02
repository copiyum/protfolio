// Cloudflare Turnstile server-side verification.
// Spec: L5 (Rate limit) — Turnstile (free, invisible, CF-native) on /admin/login + /admin/setup.

interface SiteverifyOk {
  success: true;
  challenge_ts: string;
  hostname: string;
  action?: string;
  cdata?: string;
}

interface SiteverifyErr {
  success: false;
  "error-codes": string[];
}

type SiteverifyResponse = SiteverifyOk | SiteverifyErr;

export async function verifyTurnstile(
  token: string | null | undefined,
  remoteIp: string | null,
  secret: string,
  expected?: { action?: string; hostname?: string | null },
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!token) return { ok: false, reason: "missing-token" };
  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });
  if (!res.ok) return { ok: false, reason: `siteverify-http-${res.status}` };
  const json = (await res.json()) as SiteverifyResponse;
  if (json.success) {
    if (expected?.hostname && json.hostname !== expected.hostname) {
      return { ok: false, reason: "hostname-mismatch" };
    }
    if (expected?.action && json.action !== expected.action) {
      return { ok: false, reason: "action-mismatch" };
    }
    return { ok: true };
  }
  return { ok: false, reason: json["error-codes"].join(",") || "siteverify-failed" };
}
