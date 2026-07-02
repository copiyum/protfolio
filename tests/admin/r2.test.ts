import { describe, it, expect } from "vitest";
import { validateImage, extFromMime, UploadValidationError, presignPut, verifySig } from "@/lib/admin/r2";

function png(width = 1, height = 1): Uint8Array {
  const data = new Uint8Array(24);
  data.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  const view = new DataView(data.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return data;
}

describe("image validation", () => {
  it("accepts png", () => { expect(validateImage("image/png", 1024)).toBe("png"); });
  it("accepts jpeg", () => { expect(validateImage("image/jpeg", 1024)).toBe("jpg"); });
  it("rejects svg", () => { expect(() => validateImage("image/svg+xml", 1024)).toThrow(UploadValidationError); });
  it("rejects oversize", () => { expect(() => validateImage("image/png", 11 * 1024 * 1024)).toThrow(UploadValidationError); });
  it("maps jpeg", () => { expect(extFromMime("image/jpeg")).toBe("jpg"); });
  it("rejects unknown mime", () => { expect(() => validateImage("application/octet-stream", 1024)).toThrow(UploadValidationError); });
  it("rejects forged png bodies", () => {
    expect(() => validateImage("image/png", 4, new Uint8Array([1, 2, 3, 4]))).toThrow(UploadValidationError);
  });
  it("rejects oversized image dimensions", () => {
    const body = png(4097, 1);
    expect(() => validateImage("image/png", body.byteLength, body)).toThrow(UploadValidationError);
  });
});

describe("presigned PUT", () => {
  it("round-trips a signature", async () => {
    const secret = "test-secret";
    const url = await presignPut("uploads/test.webp", secret);
    const u = new URL(url, "http://x");
    const key = decodeURIComponent(u.searchParams.get("key")!);
    const exp = u.searchParams.get("exp")!;
    const sig = u.searchParams.get("sig")!;
    await expect(verifySig(key, exp, sig, secret)).resolves.toBe(true);
  });

  it("rejects wrong secret", async () => {
    const url = await presignPut("uploads/test.webp", "good-secret");
    const u = new URL(url, "http://x");
    const key = decodeURIComponent(u.searchParams.get("key")!);
    const exp = u.searchParams.get("exp")!;
    const sig = u.searchParams.get("sig")!;
    await expect(verifySig(key, exp, sig, "wrong-secret")).resolves.toBe(false);
  });

  it("rejects path traversal keys", async () => {
    const url = await presignPut("uploads/test.webp", "secret");
    const u = new URL(url, "http://x");
    const exp = u.searchParams.get("exp")!;
    const sig = u.searchParams.get("sig")!;
    await expect(verifySig("uploads/../admin/test.webp", exp, sig, "secret")).resolves.toBe(false);
  });

  it("refuses to presign invalid keys", async () => {
    await expect(presignPut("../test.webp", "secret")).rejects.toThrow(UploadValidationError);
  });
});
