"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminActionResult } from "@/lib/admin/actions/result";
import { redirectFromDigest } from "@/lib/admin/client-utils";
import { AdminButton } from "./AdminButton";
import { ErrorBanner } from "./Banners";

export function AdminActionButton({
  action,
  children,
  className,
  disabled,
  confirmMessage,
  pendingLabel = "Working...",
}: {
  action: () => Promise<AdminActionResult>;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  confirmMessage?: string;
  pendingLabel?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run() {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.ok) {
          setError(result.error);
          return;
        }
        if (result.redirectTo) router.push(result.redirectTo);
        router.refresh();
      } catch (err) {
        const redirectTo = redirectFromDigest(err);
        if (redirectTo) {
          router.push(redirectTo);
          router.refresh();
          return;
        }
        setError(err instanceof Error ? err.message : "Action failed");
      }
    });
  }

  return (
    <div className="space-y-2">
      <AdminButton type="button" disabled={disabled || isPending} className={className} unstyled={!!className} onClick={run}>
        {isPending ? pendingLabel : children}
      </AdminButton>
      {error && <ErrorBanner>{error}</ErrorBanner>}
    </div>
  );
}
