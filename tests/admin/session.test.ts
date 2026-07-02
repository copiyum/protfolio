import { describe, it, expect } from "vitest";
import { signSession, verifySession } from "@/lib/admin/session";

const SECRET = "test-secret-32-bytes-min-padding-xx";
const CRED = "cred-abc";

describe("session cookie", () => {
  it("signs and verifies a payload", async () => {
    const exp = new Date(Date.now() + 60_000).toISOString();
    const cookie = await signSession({ credentialId: CRED, expiresAt: exp, nonce: "n1" }, SECRET);
    const ok = await verifySession(cookie, SECRET);
    expect(ok?.credentialId).toBe(CRED);
  });

  it("rejects tampered payload", async () => {
    const exp = new Date(Date.now() + 60_000).toISOString();
    const cookie = await signSession({ credentialId: CRED, expiresAt: exp, nonce: "n1" }, SECRET);
    const tampered = cookie.slice(0, -2) + "AA";
    expect(await verifySession(tampered, SECRET)).toBeNull();
  });

  it("rejects expired cookie", async () => {
    const exp = new Date(Date.now() - 1000).toISOString();
    const cookie = await signSession({ credentialId: CRED, expiresAt: exp, nonce: "n1" }, SECRET);
    expect(await verifySession(cookie, SECRET)).toBeNull();
  });

  it("rejects wrong secret", async () => {
    const exp = new Date(Date.now() + 60_000).toISOString();
    const cookie = await signSession({ credentialId: CRED, expiresAt: exp, nonce: "n1" }, SECRET);
    expect(await verifySession(cookie, "different-secret-padding-x")).toBeNull();
  });
});