import { describe, it, expect } from "vitest";
import { makeAuthOptions, makeRegistrationOptions, verifyAuth, verifyRegistration } from "@/lib/admin/passkey";

describe("passkey makeRegistrationOptions", () => {
  it("returns options with a challenge and RP id", async () => {
    const opts = await makeRegistrationOptions();
    expect(opts.challenge).toBeTruthy();
    expect(opts.rp.id).toBe("sarang.dev");
    expect(opts.rp.name).toBe("pf-admin");
    expect(opts.authenticatorSelection?.userVerification).toBe("required");
  });

  it("returns resident-key authentication options", async () => {
    const opts = await makeAuthOptions();
    expect(opts.challenge).toBeTruthy();
    expect(opts.rpId).toBe("sarang.dev");
    expect(opts.userVerification).toBe("required");
    expect(opts.allowCredentials).toBeUndefined();
  });

  it("rejects malformed registration responses", async () => {
    await expect(verifyRegistration({}, "challenge")).rejects.toThrow();
  });

  it("rejects malformed authentication responses", async () => {
    await expect(
      verifyAuth({}, "challenge", {
        credential_id: "cred",
        public_key: new Uint8Array(32) as Uint8Array<ArrayBuffer>,
        counter: 0,
        transports: [],
      }),
    ).rejects.toThrow();
  });
});
