import React from "react";
import styles from "./TypingSimulator.module.css";

export interface MascotProps { frameSrc: string; /** optional CSS length (eg "70px") to position the dark-mode baseline */ lineTop?: string }

export function Mascot({ frameSrc, lineTop }: MascotProps) {
  const style = lineTop ? ({ "--mascot-line-top": lineTop } as React.CSSProperties & Record<string, string>) : undefined;

  return (
    <div className={styles.mascotWrap} aria-hidden style={style}>
      {/* Raw <img>, deliberately: this sprite hot-swaps among 3 tiny local frames
          on every keystroke — next/Image's optimizer indirection adds flicker
          risk with no payoff here. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={frameSrc} alt="cat" className={styles.mascot} />
    </div>
  );
}
