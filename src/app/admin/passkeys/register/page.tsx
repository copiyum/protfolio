"use client";
import { useState } from "react";
import { beginRegistration, completeRegistration } from "@/lib/admin/actions/auth";

export default function RegisterPasskeyPage() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function register(e: React.FormEvent) {
    e.preventDefault();
    try {
      setBusy(true);
      setError(null);
      const opts = await beginRegistration();
      // @ts-expect-error WebAuthn is browser-only
      const cred = await navigator.credentials.create({ publicKey: opts });
      const fd = new FormData();
      fd.set("response", JSON.stringify(cred));
      fd.set("name", name);
      await completeRegistration(fd);
      window.location.href = "/admin/passkeys";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md p-8">
      <h1 className="mb-4 text-2xl font-semibold">Register Additional Passkey</h1>
      {error && <p className="mb-4 rounded border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-500">{error}</p>}
      <form onSubmit={register} className="space-y-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Device name"
          className="w-full rounded border border-[color:var(--foreground)]/20 bg-transparent px-2 py-1 text-sm"
          required
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded bg-[color:var(--foreground)] px-4 py-2 text-[color:var(--background)] disabled:opacity-50"
        >
          {busy ? "Awaiting authenticator…" : "Register"}
        </button>
      </form>
    </div>
  );
}