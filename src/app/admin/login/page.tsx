"use client";
import { useState } from "react";
import { beginLogin, completeLogin } from "@/lib/admin/actions/auth";
import { TurnstileWidget, getTurnstileSiteKey } from "@/components/admin/TurnstileWidget";

export default function LoginPage() {
  const [stage, setStage] = useState<"idle" | "asserting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string>("");

  async function start() {
    if (!turnstileToken) {
      setError("Bot challenge not solved");
      return;
    }
    try {
      setStage("asserting");
      setError(null);
      const opts = await beginLogin();
      // @ts-expect-error — WebAuthn is browser-only
      const cred = await navigator.credentials.get({ publicKey: opts });
      const fd = new FormData();
      fd.set("response", JSON.stringify(cred));
      fd.set("cf-turnstile-response", turnstileToken);
      const result = await completeLogin(fd);
      window.location.href = result.redirect;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Login failed";
      setError(msg);
      setStage("error");
    }
  }

  const sitekey = getTurnstileSiteKey();

  return (
    <div className="mx-auto max-w-md p-8">
      <h1 className="mb-4 text-2xl font-semibold">Admin Login</h1>
      {error && <p className="mb-4 rounded border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-500">{error}</p>}
      <button
        onClick={start}
        disabled={stage === "asserting" || !turnstileToken}
        className="w-full rounded bg-[color:var(--foreground)] px-4 py-2 text-[color:var(--background)] disabled:opacity-50"
      >
        {stage === "asserting" ? "Awaiting authenticator…" : "Sign in with passkey"}
      </button>
      {sitekey && (
        <TurnstileWidget sitekey={sitekey} action="login" onToken={setTurnstileToken} />
      )}
    </div>
  );
}