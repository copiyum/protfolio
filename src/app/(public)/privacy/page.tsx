import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy — Sarang",
  description: "Privacy notes for sarang.dev.",
};

export default function PrivacyPage() {
  return (
    <div className="relative mx-auto max-w-xl px-6 py-16">
      <main className="space-y-10">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--foreground)]/45">
            Privacy
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Privacy</h1>
          <p className="text-sm text-[color:var(--foreground)]/55">
            Last updated: July 4, 2026
          </p>
        </header>

        <section className="space-y-3 text-sm leading-6 text-[color:var(--foreground)]/72">
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">
            Visitor Notes
          </h2>
          <p>
            If you leave a drawing on the visitors board, this site stores the drawing image,
            the display name, the optional message, note color, placement metadata, and the
            submission time. This data is used to show the note on the public visitors board
            and to let the site owner moderate submissions.
          </p>
          <p>
            Visitor note images are stored in Cloudflare R2. Visitor note metadata is stored in
            Cloudflare D1. Public API responses do not expose private storage object keys.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-6 text-[color:var(--foreground)]/72">
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">
            Cloudflare Turnstile
          </h2>
          <p>
            Public visitor-note submissions are protected with Cloudflare Turnstile in invisible
            mode. Turnstile runs a browser challenge in the background and sends a token that this
            site verifies on the server before accepting a note.
          </p>
          <p>
            Cloudflare describes the client-side signals it processes and how it uses them in the{" "}
            <a
              href="https://www.cloudflare.com/turnstile-privacy-policy/"
              className="underline decoration-[color:var(--foreground)]/30 underline-offset-4 hover:decoration-[color:var(--foreground)]"
              rel="noreferrer"
              target="_blank"
            >
              Cloudflare Turnstile Privacy Addendum
            </a>
            .
          </p>
        </section>

        <section className="space-y-3 text-sm leading-6 text-[color:var(--foreground)]/72">
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">
            Admin Security
          </h2>
          <p>
            Admin-only areas use Cloudflare Access, passkeys, sessions, rate limiting, and audit
            logging. Audit logs can include credential identifiers, IP address, user agent, action
            names, target records, timestamps, and change details.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-6 text-[color:var(--foreground)]/72">
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">
            Contact
          </h2>
          <p>
            For privacy or moderation requests about visitor notes, contact the site owner through
            the public links on the home page.
          </p>
        </section>
      </main>
    </div>
  );
}
