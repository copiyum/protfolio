import { socialLinks } from "@/data/social-links";

export default function SocialLinks() {
  return (
    <ul className="flex flex-wrap gap-2 p-4">
      {socialLinks.map((s) => (
        <li key={s.label}>
          <a
            href={s.href}
            target={s.href.startsWith("http") ? "_blank" : undefined}
            rel={s.href.startsWith("http") ? "noreferrer" : undefined}
            className="group inline-flex items-center gap-2 rounded-full border border-[color:var(--foreground)]/15 px-3 py-1.5 text-sm transition-colors hover:border-[color:var(--accent)]/40 hover:bg-[color:var(--accent)]/[0.06]"
          >
            <span className="font-mono text-xs text-[color:var(--foreground)]/45 transition-colors group-hover:text-[color:var(--accent)]">
              {s.code}
            </span>
            <span className="font-medium text-[color:var(--foreground)]/85">{s.label}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
