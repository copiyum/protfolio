"use client";
import { useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { beginLogin, completeLogin } from "@/lib/admin/actions/auth";
import { TurnstileWidget, getTurnstileSiteKey } from "@/components/admin/TurnstileWidget";

export default function LoginPage() {
  const [stage, setStage] = useState<"idle" | "asserting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const [turnstileFailed, setTurnstileFailed] = useState(false);

  async function start() {
    if (!turnstileToken) {
      setError("Bot challenge not solved — disable any content blockers and retry.");
      return;
    }
    try {
      setStage("asserting");
      setError(null);
      const optionsJSON = await beginLogin();
      const responseJSON = await startAuthentication({ optionsJSON });
      const fd = new FormData();
      fd.set("response", JSON.stringify(responseJSON));
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
      {turnstileFailed && (
        <p className="mb-4 rounded border border-amber-500/30 bg-amber-500/10 p-2 text-sm text-amber-400">
          Bot challenge failed to load. Disable content blockers (uBlock, Privacy Badger, etc.)
          or allow <code className="font-mono text-xs">challenges.cloudflare.com</code> and reload.
        </p>
      )}
      <button
        onClick={start}
        disabled={stage === "asserting"}
        className="w-full rounded bg-[color:var(--foreground)] px-4 py-2 text-[color:var(--background)] disabled:opacity-50"
      >
        {stage === "asserting" ? "Awaiting authenticator…" : "Sign in with passkey"}
      </button>
      {sitekey && (
        <TurnstileWidget
          sitekey={sitekey}
          action="login"
          onToken={setTurnstileToken}
          onError={() => setTurnstileFailed(true)}
        />
      )}
    </div>
  );
}