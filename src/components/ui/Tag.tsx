import React from "react";

type TagProps = {
  children?: React.ReactNode;
  text?: string;
  className?: string;
  /** small | default */
  size?: "sm" | "md";
  /** outline or solid */
  variant?: "solid" | "outline";
};

// Theming via CSS `dark:` variants — deterministic across SSR/client (no useTheme = no hydration mismatch).
export default function Tag({
  children,
  text,
  className = "",
  size = "md",
  variant = "solid",
}: TagProps) {
  const padding = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs";
  const base = `inline-flex items-center justify-center rounded-md font-medium ${padding}`;

  const style =
    variant === "outline"
      ? "border border-[color:var(--accent)]/[0.20] bg-[color:var(--accent)]/[0.08] text-[color:var(--accent)] shadow-sm dark:border-[color:var(--foreground)]/[0.12] dark:bg-[color:var(--foreground)]/[0.08] dark:text-[color:var(--foreground)]/80 dark:shadow-none"
      : "bg-[color:var(--accent)]/[0.12] text-[color:var(--accent)] shadow-sm dark:bg-[color:var(--foreground)]/[0.10] dark:text-[color:var(--foreground)]/92";

  return <span className={`${base} ${style} ${className}`.trim()}>{children ?? text}</span>;
}
