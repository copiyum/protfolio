"use client";
import Image from "next/image";
import { useCallback, useRef, useState, useEffect } from "react";
import { PaperAirplaneIcon } from "@heroicons/react/24/solid";
import { useTheme } from "next-themes";
import styles from "./profile-block.module.css";

const ANIMATION_DURATION = 1150; // ms — ring fill/unfill phase duration

interface ProfileBlockProps {
  /** Called when the avatar-hover "highlight" phase flips, so a sibling (BioText) can react. */
  onActiveChange?: (active: boolean) => void;
}

export default function ProfileBlock({ onActiveChange }: ProfileBlockProps) {
  // Start UNCIRCLED (grey track only) and with bio UNHIGHLIGHTED by default
  const [phase, setPhase] = useState<"idle" | "loading" | "loaded" | "unloading">("idle");
  const [innerHovered, setInnerHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const timer = useRef<NodeJS.Timeout | null>(null);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Avoid hydration mismatch by only setting theme on the client after mount
  const currentTheme = mounted ? resolvedTheme : undefined;

  const startLoad = useCallback(() => {
    // If currently full or filling, start unloading towards empty; else start loading towards full
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (phase === "loaded" || phase === "loading") {
      setPhase("unloading");
      timer.current = setTimeout(() => {
        setPhase("idle");
        onActiveChange?.(false);
      }, ANIMATION_DURATION);
    } else {
      setPhase("loading");
      timer.current = setTimeout(() => {
        setPhase("loaded");
        onActiveChange?.(true);
      }, ANIMATION_DURATION);
    }
  }, [phase, onActiveChange]);

  const handleMouseLeave = useCallback(() => {
    // Reverse the animation to the starting state
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (phase === "loading") {
      // Reverse to idle
      setPhase("unloading");
      timer.current = setTimeout(() => {
        setPhase("idle");
        onActiveChange?.(false);
      }, ANIMATION_DURATION);
    } else if (phase === "unloading") {
      // Reverse to loaded
      setPhase("loading");
      timer.current = setTimeout(() => {
        setPhase("loaded");
        onActiveChange?.(true);
      }, ANIMATION_DURATION);
    }
    // If already in stable state, do nothing
  }, [phase, onActiveChange]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <div className={styles.root}>
      <div className={styles.avatarWrap}
           onMouseEnter={startLoad}
           onMouseLeave={handleMouseLeave}
           onTouchStart={startLoad}
      >
        {imgError ? (
          <div className={styles.avatarFallback} aria-label="Sarang">S</div>
        ) : (
          <Image
            src={phase === "loaded" ? "/assets/profile/pfp_dark.png" : "/assets/profile/pfp.png"}
            alt="Profile picture"
            width={64}
            height={64}
            className={styles.avatar}
            onError={() => setImgError(true)}
          />
        )}
  <svg className={styles.ringSvg} viewBox="0 0 80 80" aria-hidden suppressHydrationWarning>
          <circle className={styles.ringTrack} cx="40" cy="40" r="36" {...(currentTheme && { 'data-theme': currentTheme })} />
          <circle
            className={[
              styles.ringProgress,
              phase === "loading" ? styles.loading : "",
              phase === "loaded" ? styles.filled : "",
              phase === "unloading" ? styles.unloading : "",
            ].join(" ")}
            cx="40" cy="40" r="36"
            {...(currentTheme && { 'data-theme': currentTheme })}
          />
        </svg>
      </div>
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold text-[color:var(--foreground)]">Hey, I&apos;m Sarang <span
            role="img"
            aria-label="waving hand"
            className={`${styles.waveHand}`}
            style={{
              transform: "rotate(0deg)",
              transition: "transform 0.2s ease"
            }}
          >👋</span></h2>
        </div>
        <div className="mt-0.5 flex items-center gap-3 text-base">
          {/* fixed-size container to hold either the pulsing dot or the paper-plane icon */}
          <span className="relative flex items-center" style={{ width: 12, height: 12 }}>
            <span className={`${styles.dot} ${innerHovered ? 'hidden' : ''}`} aria-hidden />
            <span className={`${innerHovered ? 'inline-flex' : 'hidden'} items-center justify-center absolute inset-0`} aria-hidden>
              <PaperAirplaneIcon className="h-3 w-3 animate-beat text-[color:var(--foreground)]/80" />
            </span>
          </span>
          {/* 36px tall viewport; each row also 36px to avoid partial overflow */}
          <span className="relative inline-flex h-9 overflow-hidden whitespace-nowrap -mt-1"
                onMouseEnter={() => setInnerHovered(true)}
                onMouseLeave={() => setInnerHovered(false)}
          >
            <span
              className={
                `flex flex-col will-change-transform transition-transform duration-700 ease-[cubic-bezier(.25,.8,.25,1)] ${innerHovered ? '-translate-y-full' : ''}`
              }
              style={{ lineHeight: "36px" }}
            >
              {/* Row 1: exactly 36px tall, centered content */}
              <span className="h-9 flex items-center">
                <span
                  className="text-[1.05em] text-[color:var(--foreground)]/85 cursor-default select-none leading-[36px]"
                  style={{
                    textDecorationLine: "underline",
                    textDecorationStyle: "dashed",
                    textDecorationThickness: "2px",
                    textUnderlineOffset: "3px",
                    textDecorationColor: "rgb(107 114 128 / 0.4)",
                  }}
                >
                  Available for work
                </span>
              </span>
              {/* Row 2: exactly 36px tall, no border bleed */}
              <span className="h-9 flex items-center">
                <a
                  href="mailto:sarang@example.com"
                  className="no-underline text-[1.05em] text-[color:var(--foreground)]/80 pb-0 border-b-0 hover:border-transparent transition-colors flex items-center gap-1 leading-[36px]"
                >
                  reach out
                </a>
              </span>
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
