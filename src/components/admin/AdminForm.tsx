"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import type { AdminActionResult } from "@/lib/admin/actions/result";
import { AdminButton } from "./AdminButton";
import { ErrorBanner, SuccessBanner } from "./Banners";

const initialState: AdminActionResult = { ok: true };

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <AdminButton disabled={pending}>
      {pending ? "Saving..." : children}
    </AdminButton>
  );
}

export function AdminForm({
  action,
  children,
  className,
  submitLabel = "Save",
}: {
  action: (previousState: AdminActionResult, formData: FormData) => Promise<AdminActionResult>;
  children: React.ReactNode;
  className?: string;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, initialState);

  useEffect(() => {
    if (state.ok && state.redirectTo) {
      router.push(state.redirectTo);
      router.refresh();
    } else if (state.ok && state.message) {
      router.refresh();
    }
  }, [router, state]);

  return (
    <form action={formAction} className={className}>
      {children}
      {!state.ok && <ErrorBanner>{state.error}</ErrorBanner>}
      {state.ok && state.message && <SuccessBanner>{state.message}</SuccessBanner>}
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}
