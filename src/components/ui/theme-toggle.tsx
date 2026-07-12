"use client";

import { useTheme } from "next-themes";
import { useCallback } from "react";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import useHasMounted from "@/hooks/use-has-mounted";
import useReducedMotion from "@/hooks/use-reduced-motion";

export const ThemeToggleButton = ({ className = "" }: { className?: string }) => {
  const { setTheme, resolvedTheme } = useTheme();
  const mounted = useHasMounted();
  const reducedMotion = useReducedMotion();
  const isDark = mounted && resolvedTheme === "dark";

  const toggle = useCallback(() => {
    const flip = () => setTheme(isDark ? "light" : "dark");
    if (reducedMotion || !document.startViewTransition) {
      flip();
      return;
    }
    document.startViewTransition(flip);
  }, [isDark, reducedMotion, setTheme]);

  const Icon = isDark ? SunIcon : MoonIcon;
  return (
    <button
      type="button"
      aria-label={isDark ? "Use light theme" : "Use dark theme"}
      onClick={toggle}
      className={cn(
        "rounded-full bg-transparent transition-[color,transform] duration-200 active:scale-95 motion-reduce:transition-none",
        isDark ? "text-neutral-50" : "text-neutral-900",
        className,
      )}
    >
      <Icon className="size-full" aria-hidden />
    </button>
  );
};
