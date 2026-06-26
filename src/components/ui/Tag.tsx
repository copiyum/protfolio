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
      ? "border shadow-sm bg-[#F6F7FF] border-[#E9E9FB] text-[#4B4DB3] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300/85 dark:shadow-none"
      : "shadow-sm bg-[#F0F0FF] text-[#4B4DB3] dark:bg-slate-700 dark:text-slate-100";

  return <span className={`${base} ${style} ${className}`.trim()}>{children ?? text}</span>;
}
