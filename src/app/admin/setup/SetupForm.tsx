"use client";
import { useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { beginRegistration, completeRegistration } from "@/lib/admin/actions/auth";
import { TurnstileWidget } from "@/components/admin/TurnstileWidget";

export function SetupForm({ sitekey }: { sitekey: string }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const [turnstileFailed, setTurnstileFailed] = useState(false);
  const challengeReady = !!turnstileToken;

  async function register(e: React.FormEvent) {
    e.preventDefault();
    if (!sitekey) {
      setError("Bot challenge is not configured.");
      return;
    }
    if (!turnstileToken) {
      setError("Complete the bot challenge and retry.");
      return;
    }
    try {
      setBusy(true);
      setError(null);
      const optionsJSON = await beginRegistration("bootstrap");
      const responseJSON = await startRegistration({ optionsJSON });
      const fd = new FormData();
      fd.set("response", JSON.stringify(responseJSON));
      fd.set("name", name);
      fd.set("cf-turnstile-response", turnstileToken);
      await completeRegistration(fd, "bootstrap");
      window.location.href = "/admin/passkeys/register?required=1";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md p-8">
      <h1 className="mb-4 text-2xl font-semibold">Setup — Register First Passkey</h1>
      {error && <p className="mb-4 rounded border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-500">{error}</p>}
      {!sitekey && (
        <p className="mb-4 rounded border border-amber-500/30 bg-amber-500/10 p-2 text-sm text-amber-400">
          Bot challenge is not configured.
        </p>
      )}
      {turnstileFailed && (
        <p className="mb-4 rounded border border-amber-500/30 bg-amber-500/10 p-2 text-sm text-amber-400">
          Bot challenge failed to load. Disable content blockers (uBlock, Privacy Badger, etc.)
          or allow <code className="font-mono text-xs">challenges.cloudflare.com</code> and reload.
        </p>
      )}
      <form onSubmit={register} className="space-y-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Device name (e.g. MacBook Touch ID)"
          className="w-full rounded border border-[color:var(--foreground)]/20 bg-transparent px-2 py-1 text-sm"
          required
        />
        <button
          type="submit"
          disabled={busy || !challengeReady}
          className="w-full rounded bg-[color:var(--foreground)] px-4 py-2 text-[color:var(--background)] disabled:opacity-50"
        >
          {busy ? "Awaiting authenticator..." : challengeReady ? "Register" : "Complete bot check"}
        </button>
      </form>
      {sitekey && (
        <TurnstileWidget
          sitekey={sitekey}
          action="register"
          onToken={setTurnstileToken}
          onError={() => setTurnstileFailed(true)}
        />
      )}
    </div>
  );
}
