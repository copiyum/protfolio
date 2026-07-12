"use client";

import { useState } from "react";

type HoldToSubmitProps = {
  onSubmit: () => void | Promise<void>;
  className?: string;
  disabled?: boolean;
};

export default function HoldToSubmit({ onSubmit, className = "", disabled = false }: HoldToSubmitProps) {
  const [pending, setPending] = useState(false);

  const submit = async () => {
    if (disabled || pending) return;
    setPending(true);
    try {
      await onSubmit();
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={submit}
      disabled={disabled || pending}
      aria-busy={pending}
      className={`rounded-lg border border-transparent bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none ${className}`}
    >
      {pending ? "Submitting..." : "Submit note"}
    </button>
  );
}
