import { describe, it, expect } from "vitest";
import { makeRegistrationOptions } from "@/lib/admin/passkey";

describe("passkey makeRegistrationOptions", () => {
  it("returns options with a challenge and RP id", async () => {
    const opts = await makeRegistrationOptions();
    expect(opts.challenge).toBeTruthy();
    expect(opts.rp.id).toBe("sarang.dev");
    expect(opts.rp.name).toBe("pf-admin");
    expect(opts.authenticatorSelection?.userVerification).toBe("required");
  });
});