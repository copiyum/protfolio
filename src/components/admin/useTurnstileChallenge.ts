import { useState } from "react";

const PLAYWRIGHT_TURNSTILE_TOKEN = "playwright-turnstile-token";

export function useTurnstileChallenge({ bypass = false }: { bypass?: boolean } = {}) {
  const [token, setToken] = useState(bypass ? PLAYWRIGHT_TURNSTILE_TOKEN : "");
  const [failed, setFailed] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  function handleToken(nextToken: string) {
    setToken(nextToken);
    if (nextToken) setFailed(false);
  }

  function handleError() {
    setFailed(true);
  }

  function reset() {
    setToken(bypass ? PLAYWRIGHT_TURNSTILE_TOKEN : "");
    setResetKey((key) => key + 1);
  }

  return {
    token,
    failed,
    resetKey,
    challengeReady: bypass || !!token,
    bypass,
    handleToken,
    handleError,
    reset,
  };
}
