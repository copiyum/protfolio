import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[color:var(--background)] px-4 text-[color:var(--foreground)]">
      <section className="max-w-md space-y-4 text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-[color:var(--foreground)]/60">
          Page not found.
        </p>
        <Link
          href="/"
          className="inline-block rounded bg-[color:var(--foreground)] px-3 py-1.5 text-sm text-[color:var(--background)]"
        >
          Go home
        </Link>
      </section>
    </main>
  );
}
