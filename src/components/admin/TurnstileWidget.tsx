"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

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
          "timeout-callback"?: () => void;
        },
      ) => string;
      execute?: (widgetId: string) => void;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

export function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      if (!window.turnstile) return;
      settled = true;
      resolve();
    };
    const fail = () => {
      if (settled) return;
      settled = true;
      reject(new Error("turnstile-script-load-failed"));
    };
    const started = Date.now();
    const waitForGlobal = () => {
      if (window.turnstile) {
        finish();
        return;
      }
      if (Date.now() - started > 10_000) {
        fail();
        return;
      }
      window.setTimeout(waitForGlobal, 25);
    };
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener("error", fail, { once: true });
      waitForGlobal();
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = waitForGlobal;
    s.onerror = fail;
    document.head.appendChild(s);
  });
}

export interface TurnstileWidgetProps {
  sitekey: string;
  action: "login" | "register" | "visitor-note";
  onToken: (token: string) => void;
  onError?: () => void;
  resetKey?: number;
}

export function TurnstileWidget({ sitekey, action, onToken, onError, resetKey }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const lastResetKeyRef = useRef(resetKey);
  const [readyKey, setReadyKey] = useState<string | null>(null);
  const renderKey = `${sitekey}:${action}`;
  const ready = readyKey === renderKey;

  useEffect(() => {
    let cancelled = false;
    onToken("");
    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        try {
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
            "timeout-callback": () => onToken(""),
          });
          setReadyKey(renderKey);
        } catch {
          onToken("");
          onError?.();
        }
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
  }, [sitekey, action, renderKey]);

  useEffect(() => {
    if (resetKey === undefined || resetKey === lastResetKeyRef.current) return;
    lastResetKeyRef.current = resetKey;
    onToken("");
    if (widgetIdRef.current && window.turnstile) {
      try { window.turnstile.reset(widgetIdRef.current); } catch { /* noop */ }
    }
  }, [resetKey, onToken]);

  return (
    <div
      ref={containerRef}
      data-turnstile-ready={ready ? "1" : "0"}
      className="mt-3 flex min-h-[65px] justify-center"
    />
  );
}

export interface InvisibleTurnstileHandle {
  execute: () => Promise<string>;
  reset: () => void;
}

export const InvisibleTurnstile = forwardRef<InvisibleTurnstileHandle, {
  sitekey: string;
  action: "visitor-note";
  onError?: () => void;
}>(function InvisibleTurnstile({ sitekey, action, onError }, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const renderPromiseRef = useRef<Promise<void> | null>(null);
  const pendingRef = useRef<{
    resolve: (token: string) => void;
    reject: (error: Error) => void;
  } | null>(null);

  const reset = () => {
    pendingRef.current?.reject(new Error("turnstile-reset"));
    pendingRef.current = null;
    if (widgetIdRef.current && window.turnstile) {
      try { window.turnstile.reset(widgetIdRef.current); } catch { /* noop */ }
    }
  };

  const renderWidget = () => {
    if (renderPromiseRef.current) return renderPromiseRef.current;
    renderPromiseRef.current = loadTurnstileScript().then(() => {
      if (!containerRef.current || !window.turnstile || widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey,
        size: "invisible",
        appearance: "execute",
        execution: "execute",
        action,
        callback: (token) => {
          pendingRef.current?.resolve(token);
          pendingRef.current = null;
        },
        "error-callback": () => {
          pendingRef.current?.reject(new Error("turnstile-error"));
          pendingRef.current = null;
          onError?.();
        },
        "expired-callback": () => {
          pendingRef.current?.reject(new Error("turnstile-expired"));
          pendingRef.current = null;
        },
        "timeout-callback": () => {
          pendingRef.current?.reject(new Error("turnstile-timeout"));
          pendingRef.current = null;
        },
      });
    }).catch((error) => {
      onError?.();
      throw error;
    });
    return renderPromiseRef.current;
  };

  useEffect(() => {
    renderWidget().catch(() => {});
    return () => {
      pendingRef.current?.reject(new Error("turnstile-unmounted"));
      pendingRef.current = null;
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* noop */ }
      }
      widgetIdRef.current = null;
      renderPromiseRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sitekey, action]);

  useImperativeHandle(ref, () => ({
    async execute() {
      await renderWidget();
      const widgetId = widgetIdRef.current;
      if (!widgetId || !window.turnstile?.execute) {
        throw new Error("turnstile-not-ready");
      }
      if (pendingRef.current) {
        pendingRef.current.reject(new Error("turnstile-replaced"));
        pendingRef.current = null;
      }
      return new Promise<string>((resolve, reject) => {
        pendingRef.current = { resolve, reject };
        window.turnstile?.execute?.(widgetId);
      });
    },
    reset,
  }));

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
    />
  );
});
