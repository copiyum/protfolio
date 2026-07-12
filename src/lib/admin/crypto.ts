import { assertStrongSecret } from "@/lib/security";

const enc = new TextEncoder();

export { enc as adminTextEncoder };

export function b64urlEncode(buf: ArrayBuffer | Uint8Array | string): string {
  const bytes = typeof buf === "string" ? enc.encode(buf) : buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function b64urlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function hmacKey(secret: string, usages: KeyUsage[] = ["sign"]): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(assertStrongSecret("HMAC secret", secret)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usages,
  );
}
