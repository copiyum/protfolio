"use client";

import React, { useEffect, useRef } from "react";
import styles from "./interactive-showcase.module.css";

const SPRING = 0.12; // snappier spring
const DEFAULT_Y = 0.5;

export default function InteractiveShowcase() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef(DEFAULT_Y); // cursor target (0..1)
  const clipRef = useRef(DEFAULT_Y); // smoothed "water surface"

  // One rAF for the component's lifetime. Lerps the smoothed value toward the
  // target and writes it to a CSS var — no React state, so zero re-renders.
  useEffect(() => {
    let frame: number;
    const tick = () => {
      clipRef.current += (targetRef.current - clipRef.current) * SPRING;
      containerRef.current?.style.setProperty("--clip-y", `${clipRef.current * 100}%`);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const updateFromPointer = (clientY: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
    targetRef.current = y / rect.height;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[225px] overflow-hidden bg-background group rounded-none border border-[color:var(--foreground)]/10 p-3"
      style={{ "--clip-y": "50%" } as React.CSSProperties}
      onMouseMove={(e) => updateFromPointer(e.clientY)}
      onMouseLeave={() => { targetRef.current = DEFAULT_Y; }}
    >

      <div className="relative h-full flex items-center justify-center">
        {/* centered inner box approx 176px tall with light border */}
        <div className="w-full mx-3 flex items-center justify-center">
          <div className="relative h-[176px] w-full border border-[color:var(--foreground)]/10 overflow-hidden">
            {/* corner accents inside inner box */}
            {[["top-0","left-0","-50%","-50%"],["top-0","right-0","50%","-50%"],["bottom-0","left-0","-50%","50%"],["bottom-0","right-0","50%","50%"]].map((pos,i)=>(
              <React.Fragment key={i}>
                <span style={{ transform: `translate(${pos[2]}, ${pos[3]})` }} className={`absolute ${pos[0]} ${pos[1]} w-6 h-[2px] bg-indigo-400 opacity-0 group-hover:opacity-100 transition`} />
                <span style={{ transform: `translate(${pos[2]}, ${pos[3]})` }} className={`absolute ${pos[0]} ${pos[1]} h-6 w-[2px] bg-indigo-400 opacity-0 group-hover:opacity-100 transition`} />
              </React.Fragment>
            ))}

            {/* Inner clipped content container */}
            <div className="absolute inset-0 overflow-hidden flex items-center justify-center">
              {/* Base text (split into two lines) */}
              <h3 className="font-mono text-sm text-[color:var(--foreground)] select-none text-center leading-snug">
                I like to make
                <br /> things interactive.
              </h3>

              {/* Glowing stroked text (only below the line) — inherits --clip-y from the container */}
              <h3
                className={`absolute inset-0 flex flex-col items-center justify-center font-mono text-sm text-transparent select-none text-center leading-snug ${styles.glowingText}`}
              >
                <span className="block">I like to make</span>
                <span className="block">things interactive.</span>
              </h3>

              {/* Blue glowing "water fill" below the line with gradient */}
              <div
                className={`absolute left-0 right-0 ${styles.waterFill}`}
                style={{ top: "var(--clip-y)", bottom: 0 }}
              />

              {/* Floating water line */}
              <div
                className={`absolute left-0 right-0 h-[2px] ${styles.waterLine}`}
                style={{ top: "var(--clip-y)" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
