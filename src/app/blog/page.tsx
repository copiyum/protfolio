"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import AnimatedStars from "@/components/ui/animated-stars";
import { posts } from "@/data/posts";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });

export default function BlogPage() {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = [...posts].sort((a, b) => (a.date < b.date ? 1 : -1));
    if (!term) return list;
    return list.filter((p) =>
      [p.title, p.summary, ...p.tags].some((f) => f.toLowerCase().includes(term))
    );
  }, [q]);

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)]">
      <AnimatedStars />
      <div className="relative z-10 mx-auto max-w-[550px] px-4 py-8">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight">Blog</h1>
          <p className="mt-1 text-sm text-neutral-400">Notes on design, motion, and the occasional bug.</p>
        </div>

        <label className="mb-4 flex items-center gap-2 rounded-none border border-[color:var(--foreground)]/10 bg-transparent px-3 py-2">
          <MagnifyingGlassIcon className="h-4 w-4 text-[color:var(--foreground)]/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search posts…"
            className="w-full bg-transparent text-sm text-[color:var(--foreground)] placeholder:text-[color:var(--foreground)]/40 focus:outline-none"
          />
        </label>

        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-[color:var(--foreground)]/45">No posts match “{q}”.</p>
        ) : (
          <div className="overflow-hidden rounded-none border border-[color:var(--foreground)]/10 bg-transparent divide-y divide-[color:var(--foreground)]/10">
            {filtered.map((p) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="group flex gap-4 px-4 py-4 transition-colors hover:bg-[color:var(--accent)]/[0.05]"
              >
                <div
                  className="hidden h-16 w-24 shrink-0 rounded-sm sm:block"
                  style={{
                    backgroundImage: p.cover
                      ? `url('${p.cover}')`
                      : "radial-gradient(circle at 30% 30%, rgba(143,145,224,0.35), transparent 65%), var(--card-bg)",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    border: "1px solid var(--card-border)",
                  }}
                  aria-hidden
                />
                <div className="min-w-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="truncate text-sm font-semibold text-[color:var(--foreground)] group-hover:text-[color:var(--accent)]">{p.title}</h2>
                    <time className="shrink-0 text-xs text-[color:var(--foreground)]/45">{fmtDate(p.date)}</time>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-[color:var(--foreground)]/65">{p.summary}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
