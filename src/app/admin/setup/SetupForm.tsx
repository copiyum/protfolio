"use client";

import { useState, type FormEvent } from "react";
import { AdminButton, ErrorBanner, TurnstileWidget, WarningBanner } from "@/components/admin";
import {
  passkeyFormData,
  runPasskeyRegistration,
  useWebAuthnFlow,
} from "@/components/admin/useWebAuthn";
import { beginRegistrationAction, completeRegistrationAction } from "@/lib/admin/actions/auth";

export function SetupForm({ sitekey, turnstileBypass = false }: { sitekey: string; turnstileBypass?: boolean }) {
  const [name, setName] = useState("");
  const flow = useWebAuthnFlow({
    sitekey,
    turnstileBypass,
    begin: () => beginRegistrationAction("bootstrap"),
    ceremony: runPasskeyRegistration,
    complete: (formData) => completeRegistrationAction(formData, "bootstrap"),
    formData: (responseJSON, token) => passkeyFormData({ responseJSON, token, name }),
    onSuccess: () => {
      window.location.href = "/admin/passkeys/register?required=1";
    },
    fallbackError: "Registration failed",
  });

  function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void flow.run();
  }

  return (
    <div className="mx-auto max-w-md p-8">
      <h1 className="mb-4 text-2xl font-semibold">Setup — Register First Passkey</h1>
      <div className="mb-4 space-y-3">
        {flow.error && <ErrorBanner>{flow.error}</ErrorBanner>}
        {!sitekey && !turnstileBypass && <WarningBanner>Bot challenge is not configured.</WarningBanner>}
        {flow.turnstile.failed && (
          <WarningBanner>
            Bot challenge failed to load. Disable content blockers (uBlock, Privacy Badger, etc.)
            or allow <code className="font-mono text-xs">challenges.cloudflare.com</code> and reload.
          </WarningBanner>
        )}
      </div>
      <form onSubmit={register} className="space-y-3">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Device name (e.g. MacBook Touch ID)"
          className="w-full rounded border border-[color:var(--foreground)]/20 bg-transparent px-2 py-1 text-sm"
          required
        />
        <AdminButton type="submit" disabled={flow.busy || !flow.challengeReady} fullWidth className="px-4 py-2 text-base">
          {flow.busy ? "Awaiting authenticator..." : flow.challengeReady ? "Register" : "Complete bot check"}
        </AdminButton>
      </form>
      {sitekey && !turnstileBypass && (
        <TurnstileWidget
          sitekey={sitekey}
          action="register"
          onToken={flow.turnstile.handleToken}
          onError={flow.turnstile.handleError}
          resetKey={flow.turnstile.resetKey}
        />
      )}
    </div>
  );
}
