"use client";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-[color:var(--background)] px-4 text-[color:var(--foreground)]">
      <section className="max-w-md space-y-4 rounded-lg border border-[color:var(--foreground)]/10 p-5">
        <div>
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="mt-1 text-sm text-[color:var(--foreground)]/60">
            The page failed to render. Please try again.
          </p>
          {error.digest ? (
            <p className="mt-2 font-mono text-xs text-[color:var(--foreground)]/45">Reference: {error.digest}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={reset}
          className="rounded bg-[color:var(--foreground)] px-3 py-1.5 text-sm text-[color:var(--background)]"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
