"use client";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const STYLE_ID = "theme-transition-styles";

const injectStyles = (css: string) => {
  if (typeof document === "undefined") return;
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = css;
};

// circle + blur, origin at click point (percent of viewport)
const buildCircleBlurCss = (xPct: number, yPct: number) => {
  const pos = `${xPct}% ${yPct}%`;
  return `
 ::view-transition-group(root) {
  animation-duration: 1s;
  animation-timing-function: var(--expo-out);
}

::view-transition-new(root) {
  animation-name: reveal-light-blur;
}

::view-transition-old(root),
.dark::view-transition-old(root) {
  animation: hide-old 1s var(--expo-out);
  z-index: -1;
}
.dark::view-transition-new(root) {
  animation-name: reveal-dark-blur;
}

@keyframes reveal-dark-blur {
  from { clip-path: circle(0% at ${pos}); filter: blur(8px); }
  50%  { filter: blur(4px); }
  to   { clip-path: circle(200% at ${pos}); filter: blur(0); }
}

@keyframes reveal-light-blur {
  from { clip-path: circle(0% at ${pos}); filter: blur(8px); }
  50%  { filter: blur(4px); }
  to   { clip-path: circle(200% at ${pos}); filter: blur(0); }
}

@keyframes hide-old {
  from { clip-path: circle(0% at ${pos}); }
  to   { clip-path: circle(200% at ${pos}); }
}
`;
};

export const ThemeToggleButton2 = ({
  className = "",
}: {
  className?: string;
}) => {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // suppressHydrationWarning: skip until mounted so the SVG renders the correct
  // dark/light state on first paint without flicker.
  const isDark = mounted ? resolvedTheme === "dark" : false;

  const toggle = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      // ponytail: button center in viewport % so circle expands from button.
      const r = e.currentTarget.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const xPct = Math.max(0, Math.min(100, (cx / window.innerWidth) * 100));
      const yPct = Math.max(0, Math.min(100, (cy / window.innerHeight) * 100));

      injectStyles(buildCircleBlurCss(xPct, yPct));

      const next = isDark ? "light" : "dark";
      const flip = () => setTheme(next);

      if (typeof document === "undefined" || !document.startViewTransition) {
        flip();
      } else {
        document.startViewTransition(flip);
      }

      try {
        const audio = new Audio("/assets/sounds/click-soft.mp3");
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch {}
    },
    [isDark, setTheme],
  );

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={toggle}
      className={cn(
        "rounded-full transition-all duration-300 active:scale-95",
        isDark ? "text-neutral-50" : "text-neutral-900",
        className,
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        fill="currentColor"
        strokeLinecap="round"
        viewBox="0 0 32 32"
      >
        <clipPath id="skiper-btn-2">
          <motion.path
            animate={{ y: isDark ? 10 : 0, x: isDark ? -12 : 0 }}
            transition={{ ease: "easeInOut", duration: 0.35 }}
            d="M0-5h30a1 1 0 0 0 9 13v24H0Z"
          />
        </clipPath>
        <g clipPath="url(#skiper-btn-2)">
          <motion.circle
            animate={{ r: isDark ? 10 : 8 }}
            transition={{ ease: "easeInOut", duration: 0.35 }}
            cx="16"
            cy="16"
          />
          <motion.g
            animate={{
              rotate: isDark ? -100 : 0,
              scale: isDark ? 0.5 : 1,
              opacity: isDark ? 0 : 1,
            }}
            transition={{ ease: "easeInOut", duration: 0.35 }}
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M16 5.5v-4" />
            <path d="M16 30.5v-4" />
            <path d="M1.5 16h4" />
            <path d="M26.5 16h4" />
            <path d="m23.4 8.6 2.8-2.8" />
            <path d="m5.7 26.3 2.9-2.9" />
            <path d="m5.8 5.8 2.8 2.8" />
            <path d="m23.4 23.4 2.9 2.9" />
          </motion.g>
        </g>
      </svg>
    </button>
  );
};