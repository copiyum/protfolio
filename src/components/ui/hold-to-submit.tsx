"use client";

import { useState, useRef, useCallback, useEffect, type CSSProperties } from "react";
import styles from "./hold-to-submit.module.css";

const HOLD_DURATION = 1000; // ms to fill

const randomNumber = (min: number, max: number) => Math.random() * (max - min) + min;

function StarSVG({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 fill-current ${className}`} viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function AnimatedStars({ count = 25 }: { count?: number }) {
  return (
    <>
      {[...Array(count)].map((_, index) => (
        <div
          key={"star-" + index}
          className={`absolute top-0 text-foreground ${styles.star}`}
          style={{
            "--tx": `${randomNumber(-100, 100)}px`,
            "--ty": `${randomNumber(-200, -100)}px`,
            "--rot": `${randomNumber(-360, 360)}deg`,
            animationDelay: `${randomNumber(0, 0.5)}s`,
          } as CSSProperties}
        >
          <StarSVG />
        </div>
      ))}
    </>
  );
}

type HoldToSubmitProps = {
  onSubmit: () => void;
  className?: string;
  disabled?: boolean;
};

export default function HoldToSubmit({ onSubmit, className = "", disabled = false }: HoldToSubmitProps) {
  const [isHolding, setIsHolding] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [showStars, setShowStars] = useState(false);

  const barRef = useRef<HTMLDivElement | null>(null);
  const pctRef = useRef<HTMLSpanElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(0);
  const submitTimer = useRef<NodeJS.Timeout | null>(null);
  const resetTimer = useRef<NodeJS.Timeout | null>(null);

  const playSuccessSound = useCallback(() => {
    try {
      const audio = new Audio("/assets/sounds/success.mp3");
      audio.volume = 0.4;
      audio.play().catch(() => {}); // Ignore if sound fails
    } catch {}
  }, []);

  const complete = useCallback(() => {
    rafRef.current = null;
    setIsHolding(false);
    setIsComplete(true);
    setShowStars(true);
    playSuccessSound();

    // Call onSubmit after a brief delay for the animation, then reset.
    submitTimer.current = setTimeout(() => {
      onSubmit();
      resetTimer.current = setTimeout(() => {
        setIsComplete(false);
        setShowStars(false);
      }, 500);
    }, 300);
  }, [onSubmit, playSuccessSound]);

  // rAF drives the fill bar + percentage via refs — no per-frame React state.
  const startHold = useCallback(() => {
    if (disabled || isComplete) return;
    setIsHolding(true);
    startRef.current = performance.now();

    const tick = () => {
      const p = Math.min((performance.now() - startRef.current) / HOLD_DURATION, 1);
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
      if (pctRef.current) pctRef.current.textContent = `${Math.round(p * 100)}%`;
      if (p >= 1) {
        complete();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [disabled, isComplete, complete]);

  const endHold = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (barRef.current) barRef.current.style.transform = "scaleX(0)";
    setIsHolding(false);
  }, []);

  // Cleanup any pending rAF / timers on unmount.
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (submitTimer.current) clearTimeout(submitTimer.current);
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  return (
    <div className="relative">
      <button
        className={`
          relative overflow-hidden px-5 py-2.5 rounded-lg font-medium text-sm
          bg-foreground text-background transition-[opacity,transform,box-shadow] duration-[var(--motion-state)]
          select-none touch-none border border-transparent
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90 hover:scale-[1.03] active:scale-95'}
          ${isHolding ? `border-background/20 ${styles.holding}` : ''}
          ${className}
        `}
        onPointerDown={startHold}
        onPointerUp={endHold}
        onPointerLeave={endHold}
        disabled={disabled}
        style={{
          boxShadow: isHolding
            ? '0 8px 32px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.1)'
            : '0 4px 16px rgba(0,0,0,0.2)'
        }}
      >
        {/* Progress background — transform written per-frame via barRef */}
        <div
          ref={barRef}
          className={`absolute inset-0 bg-background/20 ${styles.progress}`}
          style={{ transform: "scaleX(0)" }}
        />

        {/* Button text */}
        <div className="relative z-10">
          <div className="flex items-center gap-2 px-2">
            <div>
              <StarSVG className={isHolding ? styles.spin : ""} />
            </div>
            <div className="flex items-center gap-2">
              {isHolding ? (
                <span ref={pctRef} className={`text-sm font-mono ${styles.popIn}`}>0%</span>
              ) : (
                <div className="flex">
                  <span>Hold to Submit</span>
                  {isComplete
                    ? ["t", "e", "d"].map((char, index) => (
                        <span
                          key={char + index}
                          className={styles.dropIn}
                          style={{ animationDelay: `${0.1 * index}s` }}
                        >
                          {char}
                        </span>
                      ))
                    : null}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stars animation */}
        {showStars && (
          <div className="absolute inset-0 pointer-events-none">
            <AnimatedStars count={25} />
          </div>
        )}
      </button>
    </div>
  );
}
