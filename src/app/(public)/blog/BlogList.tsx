"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import type { PostSummary } from "@/data/posts";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

export default function BlogList({ posts }: { posts: PostSummary[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = [...posts].sort((a, b) => b.date.localeCompare(a.date));
    if (!term) return list;
    return list.filter((p) =>
      [p.title, p.summary, ...p.tags].some((f) => f.toLowerCase().includes(term)),
    );
  }, [posts, q]);

  const groups = filtered.reduce<Record<string, PostSummary[]>>((result, post) => {
    const year = post.date.slice(0, 4);
    (result[year] ??= []).push(post);
    return result;
  }, {});

  return (
    <>
      <label htmlFor="blog-search" className="mb-4 flex items-center gap-2 rounded-none border border-[color:var(--foreground)]/10 bg-transparent px-3 py-2">
        <span className="sr-only">Search posts</span>
        <MagnifyingGlassIcon className="h-4 w-4 text-[color:var(--foreground)]/40" />
        <input
          id="blog-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search posts..."
          className="w-full bg-transparent text-sm text-[color:var(--foreground)] placeholder:text-[color:var(--foreground)]/40 focus:outline-none"
        />
      </label>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-[color:var(--foreground)]/45" role="status">
          {posts.length === 0 ? "No posts have been published yet." : <>No posts match &quot;{q}&quot;.</>}
        </p>
      ) : (
        <div className="space-y-9">
          {Object.entries(groups)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([year, yearPosts]) => (
              <section key={year}>
                <h2 className="mb-2 border-b border-[color:var(--foreground)]/15 pb-2 font-mono text-xs text-[color:var(--foreground)]/45">
                  {year}
                </h2>
                <div>
                  {yearPosts.map((post) => (
                    <Link
                      key={post.slug}
                      href={`/blog/${post.slug}`}
                      className="group grid gap-2 border-b border-[color:var(--foreground)]/10 py-4 sm:grid-cols-[1fr_auto] sm:gap-x-8"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-mono text-base font-semibold tracking-[-.03em] group-hover:text-[color:var(--accent)]">
                            {post.title}
                          </h3>
                          {post.hasRichBody && (
                            <span className="rounded border border-[color:var(--accent)]/30 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-[color:var(--accent)]">
                              field note
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm leading-6 text-[color:var(--foreground)]/60">
                          {post.summary}
                        </p>
                        <ul className="mt-2 flex flex-wrap gap-1.5">
                          {post.tags.map((tag, index) => (
                            <li key={`${index}-${tag}`} className="font-mono text-[10px] text-[color:var(--foreground)]/45">
                              #{tag}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <time className="font-mono text-[10px] text-[color:var(--foreground)]/45">
                        {fmtDate(post.date)}
                      </time>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
        </div>
      )}
    </>
  );
}
