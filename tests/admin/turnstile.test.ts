import { describe, it, expect, vi, afterEach } from "vitest";
import { verifyTurnstile } from "@/lib/admin/turnstile";

describe("turnstile siteverify", () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it("rejects missing token", async () => {
    const r = await verifyTurnstile(null, "1.2.3.4", "secret");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("missing-token");
  });

  it("accepts siteverify success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, challenge_ts: "2026-07-02T00:00:00Z", hostname: "sarang.dev" }), { status: 200 }),
    );
    const r = await verifyTurnstile("tok", "1.2.3.4", "secret");
    expect(r.ok).toBe(true);
  });

  it("rejects siteverify failure with error codes", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false, "error-codes": ["invalid-input-response", "timeout-or-duplicate"] }), { status: 200 }),
    );
    const r = await verifyTurnstile("tok", "1.2.3.4", "secret");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("invalid-input-response,timeout-or-duplicate");
  });

  it("rejects on non-2xx siteverify HTTP", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("oops", { status: 500 }));
    const r = await verifyTurnstile("tok", "1.2.3.4", "secret");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("siteverify-http-500");
  });

  it("posts secret + response + remoteip to siteverify endpoint", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, challenge_ts: "2026-07-02T00:00:00Z", hostname: "sarang.dev" }), { status: 200 }),
    );
    await verifyTurnstile("tok", "9.9.9.9", "sec");
    expect(spy).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.objectContaining({ method: "POST" }),
    );
    const body = spy.mock.calls[0][1]?.body as URLSearchParams;
    expect(body.get("secret")).toBe("sec");
    expect(body.get("response")).toBe("tok");
    expect(body.get("remoteip")).toBe("9.9.9.9");
  });

  it("omits remoteip when null", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, challenge_ts: "2026-07-02T00:00:00Z", hostname: "sarang.dev" }), { status: 200 }),
    );
    await verifyTurnstile("tok", null, "sec");
    const body = spy.mock.calls[0][1]?.body as URLSearchParams;
    expect(body.has("remoteip")).toBe(false);
  });
});