const MIN_SECRET_BYTES = 32;
const encoder = new TextEncoder();

export function assertStrongSecret(name: string, value: string | undefined): string {
  const secret = value?.trim() ?? "";
  const bytes = encoder.encode(secret);
  const blocked = new Set(["secret", "password", "changeme", "change-me", "test", "example"]);

  if (bytes.byteLength < MIN_SECRET_BYTES || blocked.has(secret.toLowerCase()) || new Set(secret).size < 8) {
    throw new Error(`${name} must contain at least ${MIN_SECRET_BYTES} bytes of high-entropy secret material`);
  }
  return secret;
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function trustedClientIp(headers: Headers): string {
  return headers.get("cf-connecting-ip")?.trim() || "unknown";
}

export async function fingerprintIp(
  ip: string,
  secretValue: string | undefined,
  now = new Date(),
): Promise<string> {
  if (ip === "unknown") return "ip:unknown";
  const secret = assertStrongSecret("RATE_LIMIT_SECRET", secretValue);
  const period = now.toISOString().slice(0, 7);
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(`${period}:${ip}`)),
  );
  return `ip:${period}:${base64Url(mac.slice(0, 16))}`;
}
