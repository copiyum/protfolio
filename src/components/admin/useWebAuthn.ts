"use client";

import { useState } from "react";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { useTurnstileChallenge } from "./useTurnstileChallenge";

type DataResult<T> = { ok: true; data: T } | { ok: false; error: string };

type RegistrationOptions = Parameters<typeof startRegistration>[0]["optionsJSON"];
type AuthenticationOptions = Parameters<typeof startAuthentication>[0]["optionsJSON"];

export async function runPasskeyRegistration(optionsJSON: RegistrationOptions) {
  return startRegistration({ optionsJSON });
}

export async function runPasskeyAuthentication(optionsJSON: AuthenticationOptions) {
  return startAuthentication({ optionsJSON });
}

export function passkeyFormData({
  responseJSON,
  token,
  name,
  next,
}: {
  responseJSON: unknown;
  token: string;
  name?: string;
  next?: string;
}) {
  const formData = new FormData();
  formData.set("response", JSON.stringify(responseJSON));
  formData.set("cf-turnstile-response", token);
  if (name !== undefined) formData.set("name", name);
  if (next) formData.set("next", next);
  return formData;
}

export function useWebAuthnFlow<TOptions, TResult>({
  sitekey,
  turnstileBypass = false,
  begin,
  ceremony,
  complete,
  formData,
  onSuccess,
  fallbackError,
  missingTokenError = "Complete the bot challenge and retry.",
}: {
  sitekey: string;
  turnstileBypass?: boolean;
  begin: () => Promise<DataResult<TOptions>>;
  ceremony: (options: TOptions) => Promise<unknown>;
  complete: (formData: FormData) => Promise<DataResult<TResult>>;
  formData: (responseJSON: unknown, token: string) => FormData;
  onSuccess: (result: TResult) => void;
  fallbackError: string;
  missingTokenError?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const turnstile = useTurnstileChallenge({ bypass: turnstileBypass });

  function fail(message: string) {
    setError(message);
    setBusy(false);
    turnstile.reset();
  }

  async function run() {
    if (!sitekey && !turnstileBypass) {
      setError("Bot challenge is not configured.");
      return;
    }
    if (!turnstile.token) {
      setError(missingTokenError);
      return;
    }

    try {
      setBusy(true);
      setError(null);
      const options = await begin();
      if (!options.ok) {
        fail(options.error);
        return;
      }
      const responseJSON = await ceremony(options.data);
      const result = await complete(formData(responseJSON, turnstile.token));
      if (!result.ok) {
        fail(result.error);
        return;
      }
      onSuccess(result.data);
    } catch (error) {
      fail(error instanceof Error ? error.message : fallbackError);
    }
  }

  return {
    busy,
    error,
    setError,
    turnstile,
    challengeReady: turnstile.challengeReady,
    run,
  };
}
