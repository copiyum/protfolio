"use client";
import { useEffect, useRef, useState } from "react";

// Cloudflare Turnstile — compact widget per spec L5 (Rate limit).
// Resolves a token via the callback. Token is single-use and short-lived;
// consumer must pass it server-side within ~2 min.
//
// Loaded from the official Turnstile script. The `action` parameter surfaces in
// the siteverify response so the server can verify the token matches the
// expected stage (login vs register).

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          size?: "normal" | "compact" | "flexible" | "invisible";
          appearance?: "always" | "execute" | "interaction-only";
          execution?: "render" | "execute";
          action?: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
        },
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("turnstile-script-load-failed")));
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("turnstile-script-load-failed"));
    document.head.appendChild(s);
  });
}

export interface TurnstileWidgetProps {
  sitekey: string;
  action: "login" | "register";
  onToken: (token: string) => void;
  onError?: () => void;
}

export function TurnstileWidget({ sitekey, action, onToken, onError }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey,
          size: "compact",
          appearance: "always",
          execution: "render",
          action,
          callback: onToken,
          "error-callback": () => {
            onToken("");
            onError?.();
          },
          "expired-callback": () => onToken(""),
        });
        setReady(true);
      })
      .catch(() => {
        // Script failed to load (network error or content blocker). Surface via
        // onError so the form can warn the user; server-side verify will still
        // reject empty tokens.
        onError?.();
      });
    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* noop */ }
        widgetIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sitekey, action]);

  return (
    <div
      ref={containerRef}
      data-turnstile-ready={ready ? "1" : "0"}
      className="mt-3 flex min-h-[65px] justify-center"
    />
  );
}
