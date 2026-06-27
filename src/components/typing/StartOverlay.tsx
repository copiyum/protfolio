import React from "react";
import styles from "./TypingSimulator.module.css";

export interface StartOverlayProps { onStart: () => void; leaving?: boolean }

export function StartOverlay({ onStart, leaving = false }: StartOverlayProps) {
  return (
    <div className={`${styles.disclaimerWrap} ${leaving ? styles.disclaimerWrapLeaving : ""}`}>
      <button
        type="button"
        className={styles.disclaimerBox}
        onClick={onStart}
        aria-label="Click to start typing"
      >
        <div className={styles.disclaimerTitle}>Click to type — the cat is watching 👀</div>
      </button>
    </div>
  );
}
