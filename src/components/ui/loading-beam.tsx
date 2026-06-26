"use client";
import { useEffect, useState } from "react";
import styles from "./loading-beam.module.css";

const LOADING_BEAM_DURATION = 1400; // ms — beam fill + fade-out

export default function LoadingBeam() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // beam fills (CSS), then we fade the overlay out — timeout-driven (keyframe names are
    // CSS-module-hashed, so an animationend name check can't be relied on).
    const t = setTimeout(() => setVisible(false), LOADING_BEAM_DURATION);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`${styles.fullscreen} ${!visible ? styles.hidden : ''}`} aria-hidden>
      <div className={styles.wrapper}>
        <div className={styles.beam} />
      </div>
    </div>
  );
}
