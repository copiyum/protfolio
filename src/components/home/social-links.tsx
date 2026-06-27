import { socialLinks } from "@/data/social-links";

const brandIcons: Record<string, React.ReactNode> = {
  GitHub: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5 fill-current">
      <path d="M12 2C6.48 2 2 6.59 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.09.68-.22.68-.49v-1.9c-2.78.62-3.37-1.22-3.37-1.22-.45-1.19-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.35 1.12 2.92.86.09-.66.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 6.97c.85 0 1.7.12 2.5.34 1.9-1.33 2.74-1.05 2.74-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.79-4.57 5.05.36.32.68.94.68 1.9v2.82c0 .27.18.59.69.49A10.17 10.17 0 0 0 22 12.25C22 6.59 17.52 2 12 2Z" />
    </svg>
  ),
  LinkedIn: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5 fill-current">
      <path d="M6.94 8.87H3.85V20h3.09V8.87ZM5.4 7.35A1.77 1.77 0 1 0 5.38 3.8 1.77 1.77 0 0 0 5.4 7.35ZM20.15 13.74c0-3.42-1.82-5.02-4.25-5.02-1.96 0-2.84 1.08-3.33 1.84V8.87H9.6V20h3.09v-5.5c0-1.47.28-2.9 2.1-2.9 1.8 0 1.82 1.68 1.82 2.99V20h3.54v-6.26Z" />
    </svg>
  ),
  X: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5 fill-current">
      <path d="M14.22 10.16 22.96 0h-2.07l-7.59 8.82L7.24 0H.25l9.17 13.34L.25 24h2.07l8.02-9.32L16.76 24h6.99l-9.53-13.84Zm-2.84 3.3-.93-1.33L3.06 1.56h3.19l5.96 8.52.93 1.33 7.75 11.09H17.7l-6.32-9.04Z" />
    </svg>
  ),
  Instagram: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5 fill-current">
      <path d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm0 2A3.8 3.8 0 0 0 4 7.8v8.4A3.8 3.8 0 0 0 7.8 20h8.4a3.8 3.8 0 0 0 3.8-3.8V7.8A3.8 3.8 0 0 0 16.2 4H7.8ZM12 7.2a4.8 4.8 0 1 1 0 9.6 4.8 4.8 0 0 1 0-9.6Zm0 2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Zm5-2.55a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1Z" />
    </svg>
  ),
};

export default function SocialLinks() {
  return (
    <section aria-labelledby="elsewhere-heading">
      <h2
        id="elsewhere-heading"
        className="mb-2 text-sm font-medium tracking-normal text-[color:var(--foreground)]/55"
      >
        Elsewhere
      </h2>
      <ul className="flex flex-wrap gap-2">
        {socialLinks.map((s) => (
          <li key={s.label}>
            <a
              href={s.href}
              target={s.href.startsWith("http") ? "_blank" : undefined}
              rel={s.href.startsWith("http") ? "noreferrer" : undefined}
              className="group inline-flex min-h-9 items-center gap-2 rounded-full border border-[color:var(--foreground)]/10 bg-[color:var(--foreground)]/[0.025] px-2.5 pr-3.5 text-sm text-[color:var(--foreground)]/82 transition-[background-color,border-color,color,transform] duration-150 ease-out hover:-translate-y-0.5 hover:border-[color:var(--foreground)]/20 hover:bg-[color:var(--foreground)]/[0.045] hover:text-[color:var(--foreground)] active:translate-y-0 active:scale-[0.98]"
            >
              <span className="flex size-6 items-center justify-center rounded-full border border-[color:var(--foreground)]/8 bg-[color:var(--foreground)]/[0.04] text-[color:var(--foreground)]/48 transition-colors group-hover:border-[color:var(--accent)]/20 group-hover:text-[color:var(--accent)]">
                {brandIcons[s.label]}
              </span>
              <span className="font-medium leading-none">{s.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
