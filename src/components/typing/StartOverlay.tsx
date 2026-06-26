import React from "react";
import styles from "./TypingSimulator.module.css";

export interface StartOverlayProps { onStart: () => void }

export function StartOverlay({ onStart }: StartOverlayProps) {
  return (
    <div className={styles.disclaimerWrap}>
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
