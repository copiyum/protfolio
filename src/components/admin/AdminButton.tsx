import type { ButtonHTMLAttributes, ReactNode } from "react";

const toneClasses = {
  primary: "bg-[color:var(--foreground)] text-[color:var(--background)]",
  danger: "border border-red-500/30 text-red-500 hover:bg-red-500/10",
  neutral: "border border-[color:var(--foreground)]/20 hover:bg-[color:var(--foreground)]/5",
};

export function AdminButton({
  children,
  className = "",
  fullWidth = false,
  unstyled = false,
  tone = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  fullWidth?: boolean;
  unstyled?: boolean;
  tone?: keyof typeof toneClasses;
}) {
  const toneClass = unstyled ? "" : toneClasses[tone];
  return (
    <button
      {...props}
      className={`${fullWidth ? "w-full " : ""}rounded px-3 py-1 text-sm disabled:opacity-50 ${toneClass} ${className}`}
    >
      {children}
    </button>
  );
}
