import type { ReactNode } from "react";

const toneClasses = {
  error: "border-red-500/30 bg-red-500/10 text-red-500",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-400",
};

function Banner({ children, tone }: { children: ReactNode; tone: keyof typeof toneClasses }) {
  return (
    <p className={`rounded border px-3 py-2 text-sm ${toneClasses[tone]}`}>
      {children}
    </p>
  );
}

export function ErrorBanner({ children }: { children: ReactNode }) {
  return <Banner tone="error">{children}</Banner>;
}

export function SuccessBanner({ children }: { children: ReactNode }) {
  return <Banner tone="success">{children}</Banner>;
}

export function WarningBanner({ children }: { children: ReactNode }) {
  return <Banner tone="warning">{children}</Banner>;
}
