import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import type { ArticleDocument } from "@/lib/blog/document";
import { extractHeadings, readingTimeMinutes } from "@/lib/blog/plain-text";
import { ArticleProgress } from "./ArticleProgress";
import { ArticleRenderer } from "./ArticleRenderer";
import { DepthRail } from "./DepthRail";
import styles from "./article.module.css";

type ArticlePost = {
  title: string;
  date: string;
  summary: string;
  tags: string[];
  slug?: string;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

export function ArticleShell({
  post,
  document,
  preview = false,
}: {
  post: ArticlePost;
  document: ArticleDocument;
  preview?: boolean;
}) {
  const headings = extractHeadings(document);
  const year = new Date(post.date).getUTCFullYear();
  const minutes = readingTimeMinutes(document);

  return (
    <>
      <ArticleProgress />
      <DepthRail headings={headings} />
      <article className={styles.article}>
        {!preview && (
          <Link href="/blog" className={styles.back}>
            <ArrowLeftIcon aria-hidden className={styles.backIcon} />
            Blog
          </Link>
        )}

        <header className={styles.hero}>
          <p className={styles.overline}>
            <strong>{preview ? "Draft preview" : "Field note"}</strong>
            {post.tags[0] ? ` · ${post.tags[0]}` : null}
          </p>
          <h1 className={styles.title}>{post.title}</h1>
          <div className={styles.heroGrid}>
            <p className={styles.summary}>{post.summary}</p>
            <div className={styles.meta}>
              <span>by Sarang</span>
              <br />
              <time dateTime={post.date}>{fmtDate(post.date)}</time>
              <br />
              {minutes} minute {preview ? "preview" : "field note"}
              {post.tags.length > 0 && (
                <ul className={styles.tags} aria-label="Article tags">
                  {post.tags.map((tag, index) => (
                    <li key={`${index}-${tag}`}>{tag}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </header>

        <ArticleRenderer document={document} />

        <footer className={styles.endnote}>
          <span>{preview ? "Draft preview" : "Field note"}</span>
          <span>
            {post.title} · {year}
          </span>
        </footer>
      </article>
    </>
  );
}
