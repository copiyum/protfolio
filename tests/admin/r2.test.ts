import { describe, it, expect } from "vitest";
import { validateImage, extFromMime, UploadValidationError, presignPut, verifySig } from "@/lib/admin/r2";

describe("image validation", () => {
  it("accepts png", () => { expect(validateImage("image/png", 1024)).toBe("png"); });
  it("accepts jpeg", () => { expect(validateImage("image/jpeg", 1024)).toBe("jpg"); });
  it("rejects svg", () => { expect(() => validateImage("image/svg+xml", 1024)).toThrow(UploadValidationError); });
  it("rejects oversize", () => { expect(() => validateImage("image/png", 11 * 1024 * 1024)).toThrow(UploadValidationError); });
  it("maps jpeg", () => { expect(extFromMime("image/jpeg")).toBe("jpg"); });
  it("rejects unknown mime", () => { expect(() => validateImage("application/octet-stream", 1024)).toThrow(UploadValidationError); });
});

describe("presigned PUT", () => {
  it("round-trips a signature", async () => {
    const secret = "test-secret";
    const url = await presignPut("uploads/test.webp", secret);
    const u = new URL(url, "http://x");
    const key = decodeURIComponent(u.searchParams.get("key")!);
    const exp = u.searchParams.get("exp")!;
    const sig = u.searchParams.get("sig")!;
    expect(verifySig(key, exp, sig, secret)).toBe(true);
  });

  it("rejects wrong secret", async () => {
    const url = await presignPut("uploads/test.webp", "good-secret");
    const u = new URL(url, "http://x");
    const key = decodeURIComponent(u.searchParams.get("key")!);
    const exp = u.searchParams.get("exp")!;
    const sig = u.searchParams.get("sig")!;
    expect(verifySig(key, exp, sig, "wrong-secret")).toBe(false);
  });
});