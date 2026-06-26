import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import AnimatedStars from "@/components/ui/animated-stars";
import { posts } from "@/data/posts";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });

const readingTime = (paragraphs: string[]) => {
  const words = paragraphs.join(" ").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
};

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) return { title: "Post not found — Sarang" };
  return { title: `${post.title} — Sarang`, description: post.summary };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) notFound();

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)]">
      <AnimatedStars />
      <article className="relative z-10 mx-auto max-w-[640px] px-4 py-8">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-[color:var(--foreground)]/55 transition-colors hover:text-[color:var(--accent)]"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Blog
        </Link>

        <header className="mt-6">
          <h1 className="text-3xl font-semibold tracking-tight text-balance text-[color:var(--foreground)]">
            {post.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[color:var(--foreground)]/45">
            <time dateTime={post.date}>{fmtDate(post.date)}</time>
            <span aria-hidden>·</span>
            <span>{readingTime(post.content)} min read</span>
            {post.tags.length > 0 && (
              <>
                <span aria-hidden>·</span>
                <ul className="flex flex-wrap gap-1.5">
                  {post.tags.map((t) => (
                    <li
                      key={t}
                      className="rounded-md border border-[color:var(--foreground)]/10 bg-[color:var(--foreground)]/[0.04] px-1.5 py-0.5 font-mono text-xs text-[color:var(--foreground)]/60"
                    >
                      {t}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </header>

        <hr className="my-7 border-[color:var(--foreground)]/10" />

        <div className="space-y-5 text-[15px] leading-relaxed text-[color:var(--foreground)]/80">
          {post.content.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </article>
    </div>
  );
}
