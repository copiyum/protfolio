"use client";
import { useEffect, useRef, useState } from "react";

// Cloudflare Turnstile — invisible widget per spec L5 (Rate limit).
// Renders nothing visible; resolves a token via the callback. Token is
// single-use and short-lived; consumer must pass it server-side within ~2 min.
//
// Loaded from the official Turnstile script; mounted into the parent so its
// iframe inherits the form's position. The `action` parameter surfaces in the
// siteverify response so the server can verify the token matches the expected
// stage (login vs register).

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          size?: "normal" | "compact" | "flexible";
          appearance?: "always" | "execute" | "interaction-only";
          execution?: "render" | "execute";
          action?: string;
          parentOrigin?: string;
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
          size: "flexible",
          appearance: "interaction-only",
          // execution: "render" runs the challenge immediately on mount.
          // Previously "execute" required an explicit turnstile.execute() call,
          // which the disabled login button could never make — deadlocking the form.
          execution: "render",
          // The admin renders inside Cloudflare Access's auth UI iframe
          // (floral-tree-4100.cloudflareaccess.com) when Service Auth is on.
          // Turnstile's iframe (challenges.cloudflare.com) auto-detects its
          // parent window origin and sometimes picks its own origin as the
          // postMessage targetOrigin, which the browser rejects as a
          // cross-origin mismatch — the token callback never fires. Pin
          // parentOrigin to the address-bar origin so the callback path works.
          parentOrigin: typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}` : undefined,
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
      aria-hidden="true"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    />
  );
}

export function getTurnstileSiteKey(): string {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY ?? "";
}