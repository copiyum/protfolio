"use client";
import React from "react";
import styles from "./TypingSimulator.module.css";

export interface HUDProps { wpm: number; accuracy: number }

export function HUD({ wpm, accuracy }: HUDProps) {
  return (
    <div className={styles.hud} aria-hidden>
      <div className={styles.stat}><div className={styles.statLabel}>WPM</div><div className={styles.statValue}>{wpm}</div></div>
      <div className={styles.stat}><div className={styles.statLabel}>ACC</div><div className={styles.statValue}>{accuracy}%</div></div>
    </div>
  );
}
