"use client";

import { useEffect, useRef, useState } from "react";
import styles from "../article.module.css";

type CopyState = "idle" | "copied" | "failed";

export function CodeBlock({
  code,
  language,
  filename,
  highlightLines,
}: {
  code: string;
  language: string;
  filename?: string;
  highlightLines: number[];
}) {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  async function copy() {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(code);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    resetTimer.current = setTimeout(() => setCopyState("idle"), 1600);
  }

  const copyLabel = copyState === "copied" ? "copied" : copyState === "failed" ? "copy failed" : "copy";

  return (
    <section className={styles.codeBlock} aria-label={`${language} code sample`}>
      <header className={styles.codeToolbar}>
        <span className={styles.codeFile}>{filename ?? language}</span>
        <button
          type="button"
          onClick={copy}
          className={styles.copyButton}
          data-state={copyState}
          aria-label={copyState === "idle" ? "Copy code" : copyLabel}
          aria-live="polite"
        >
          {copyLabel}
        </button>
      </header>
      <pre className={styles.codeBody}>
        <code>
          {code.split("\n").map((line, index) => {
            const highlighted = highlightLines.includes(index + 1);
            return (
              <span key={index} className={styles.codeLine} data-highlighted={highlighted}>
                <span className={styles.lineNumber} aria-hidden="true">
                  {index + 1}
                </span>
                {line || " "}
                {"\n"}
              </span>
            );
          })}
        </code>
      </pre>
    </section>
  );
}
