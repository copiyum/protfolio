"use client";
import React from "react";
import NumberFlow from "@number-flow/react";
import styles from "./TypingSimulator.module.css";

export interface ResultOverlayProps { wpm: number; accuracy: number }

export function ResultOverlay({ wpm, accuracy }: ResultOverlayProps) {
  return (
    <div className={styles.result} aria-live="polite">
      <div className={styles.resultBox}>
        <div className={styles.resultRow}><span>WPM</span><strong><NumberFlow value={wpm} /></strong></div>
        <div className={styles.resultRow}><span>ACC</span><strong><NumberFlow value={accuracy} suffix="%" /></strong></div>
        <div className={styles.resultHint}>Press [tab] to restart</div>
      </div>
    </div>
  );
}
