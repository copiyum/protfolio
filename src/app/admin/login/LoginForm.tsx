"use client";

import { AdminButton, ErrorBanner, TurnstileWidget, WarningBanner } from "@/components/admin";
import {
  passkeyFormData,
  runPasskeyAuthentication,
  useWebAuthnFlow,
} from "@/components/admin/useWebAuthn";
import { beginLoginAction, completeLoginAction } from "@/lib/admin/actions/auth";

export function LoginForm({ sitekey, turnstileBypass = false }: { sitekey: string; turnstileBypass?: boolean }) {
  const flow = useWebAuthnFlow({
    sitekey,
    turnstileBypass,
    begin: beginLoginAction,
    ceremony: runPasskeyAuthentication,
    complete: completeLoginAction,
    formData: (responseJSON, token) => passkeyFormData({ responseJSON, token }),
    onSuccess: (result) => {
      window.location.href = result.redirect;
    },
    fallbackError: "Login failed",
  });

  return (
    <div className="mx-auto max-w-md p-8">
      <h1 className="mb-4 text-2xl font-semibold">Admin Login</h1>
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
      <AdminButton onClick={() => void flow.run()} disabled={flow.busy || !flow.challengeReady} fullWidth className="px-4 py-2 text-base">
        {flow.busy ? "Awaiting authenticator..." : flow.challengeReady ? "Sign in with passkey" : "Complete bot check"}
      </AdminButton>
      {sitekey && !turnstileBypass && (
        <TurnstileWidget
          sitekey={sitekey}
          action="login"
          onToken={flow.turnstile.handleToken}
          onError={flow.turnstile.handleError}
          resetKey={flow.turnstile.resetKey}
        />
      )}
    </div>
  );
}
