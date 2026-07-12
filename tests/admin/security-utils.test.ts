import { describe, expect, it } from "vitest";
import { assertStrongSecret, fingerprintIp, trustedClientIp } from "@/lib/security";

describe("security utilities", () => {
  it("rejects weak configured secrets", () => {
    expect(() => assertStrongSecret("TEST_SECRET", "short-secret")).toThrow(/32 bytes/);
    expect(() => assertStrongSecret("TEST_SECRET", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")).toThrow(/32 bytes/);
  });

  it("creates rotating, non-reversible IP identifiers", async () => {
    const secret = "fingerprint-key-9vN4xQ2mL7pR8sT6cD5";
    const july = await fingerprintIp("1.2.3.4", secret, new Date("2026-07-12T00:00:00Z"));
    const august = await fingerprintIp("1.2.3.4", secret, new Date("2026-08-01T00:00:00Z"));
    expect(july).toMatch(/^ip:2026-07:/);
    expect(july).not.toContain("1.2.3.4");
    expect(august).not.toBe(july);
  });

  it("trusts only Cloudflare's client address header", () => {
    expect(trustedClientIp(new Headers({ "x-forwarded-for": "1.2.3.4" }))).toBe("unknown");
    expect(trustedClientIp(new Headers({ "cf-connecting-ip": "5.6.7.8" }))).toBe("5.6.7.8");
  });
});
