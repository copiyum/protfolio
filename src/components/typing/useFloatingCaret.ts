"use client";
import { useRef } from "react";
import type { CaretPos } from "./types";

export function useFloatingCaret(reducedMotion: boolean) {
  const lastCaretPos = useRef<CaretPos | null>(null);
  const lastTypeTs = useRef<number | null>(null);

  const moveCaretTo = (refs: {
    caret: HTMLSpanElement | null;
    ghost: HTMLSpanElement | null;
    connector: HTMLSpanElement | null;
  }, x: number, y: number, w: number) => {
    const caret = refs.caret;
    const ghost = refs.ghost;
    const ghostConnector = refs.connector;
    if (!caret) return;

    const now = Date.now();
    const prev = lastCaretPos.current ?? { x, y, w };
    const delta = lastTypeTs.current ? Math.max(30, now - lastTypeTs.current) : 120;
    const duration = reducedMotion ? 0 : Math.max(140, Math.min(420, Math.round(delta * 1.1)));

    if (ghost) {
      const caretCurTransform = caret.style.transform || `translate3d(${prev.x}px, ${prev.y}px, 0)`;
      const caretCurWidth = caret.style.width || `${Math.max(1, prev.w)}px`;
      ghost.style.transition = duration ? `transform ${duration}ms var(--ease-standard), width ${duration}ms var(--ease-standard), opacity ${Math.max(300, duration)}ms var(--ease-standard)` : "none";
      ghost.style.transform = caretCurTransform;
      ghost.style.width = caretCurWidth;
      ghost.style.opacity = "0.62";
      // force layout
      void ghost.getBoundingClientRect();
    }

    if (ghostConnector) {
      const startX = Math.min(prev.x, x);
      const endX = Math.max(prev.x + prev.w, x + w);
      const spanWidth = Math.max(1, endX - startX);
      ghostConnector.style.transition = duration ? `transform ${duration}ms var(--ease-standard), width ${duration}ms var(--ease-standard), opacity ${Math.max(300, duration)}ms var(--ease-standard)` : "none";
      ghostConnector.style.transform = `translate3d(${startX}px, ${y}px, 0)`;
      ghostConnector.style.width = `${spanWidth}px`;
      ghostConnector.style.opacity = "0.42";
      void ghostConnector.getBoundingClientRect();
    }

    caret.style.transition = "none";
    const newTransform = `translate3d(${x}px, ${y}px, 0)`;
    const newWidth = `${Math.max(1, w)}px`;
    caret.style.transform = newTransform;
    caret.style.width = newWidth;

    if (ghost) {
      requestAnimationFrame(() => {
        if (!ghost) return;
        ghost.style.transform = newTransform;
        ghost.style.width = newWidth;
        ghost.style.opacity = "0.16";
      });
    }
    if (ghostConnector) {
      requestAnimationFrame(() => {
        if (!ghostConnector) return;
        ghostConnector.style.transform = newTransform;
        ghostConnector.style.width = newWidth;
        ghostConnector.style.opacity = "0.12";
      });
    }

    lastCaretPos.current = { x, y, w };
    lastTypeTs.current = now;
  };

  return { moveCaretTo };
}
