export function SkillTags({ skills, className = "" }: { skills?: string[]; className?: string }) {
  if (!skills?.length) return null;

  return (
    <ul className={`flex flex-wrap gap-1.5 ${className}`}>
      {skills.map((skill) => (
        <li key={skill}>
          <span className="inline-flex items-center rounded-md border border-[color:var(--foreground)]/10 bg-[color:var(--foreground)]/[0.04] px-1.5 py-0.5 font-mono text-xs text-[color:var(--foreground)]/60">
            {skill}
          </span>
        </li>
      ))}
    </ul>
  );
}
