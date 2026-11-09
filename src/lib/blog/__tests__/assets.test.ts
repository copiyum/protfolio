import { describe, expect, it } from "vitest";
import { detectBlogImage } from "@/lib/blog/assets";

describe("blog image signatures", () => {
  it("identifies PNG bytes without trusting the upload MIME type", () => {
    const bytes = new Uint8Array(24);
    bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    new DataView(bytes.buffer).setUint32(16, 640);
    new DataView(bytes.buffer).setUint32(20, 480);
    expect(detectBlogImage(bytes)).toMatchObject({ mimeType: "image/png", width: 640, height: 480 });
  });

  it("rejects arbitrary bytes and SVG-like text", () => {
    expect(detectBlogImage(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
  });
});
