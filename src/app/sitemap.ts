import type { MetadataRoute } from "next";
import { getPublishedPostSummaries } from "@/lib/admin/read";

// lastmod only where there is a real date: posts (updated/published/date), the
// blog index (newest post), and privacy (its "Last updated" date). Pages whose
// content comes from several D1 tables omit it rather than claiming "now" on
// every crawl.
const PRIVACY_UPDATED = "2026-07-12";

function validDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = (await getPublishedPostSummaries()).map((post) => ({
    slug: post.slug,
    lastModified: validDate(post.updatedAt) ?? validDate(post.publishedAt) ?? validDate(post.date),
  }));
  const newestPost = posts.reduce<Date | undefined>(
    (latest, post) => (post.lastModified && (!latest || post.lastModified > latest) ? post.lastModified : latest),
    undefined,
  );

  return [
    { url: "https://sarang.dev", changeFrequency: "weekly", priority: 1 },
    { url: "https://sarang.dev/projects", changeFrequency: "weekly", priority: 0.8 },
    { url: "https://sarang.dev/blog", lastModified: newestPost, changeFrequency: "weekly", priority: 0.7 },
    { url: "https://sarang.dev/privacy", lastModified: new Date(PRIVACY_UPDATED), changeFrequency: "monthly", priority: 0.3 },
    { url: "https://sarang.dev/visitors", changeFrequency: "weekly", priority: 0.5 },
    ...posts.map((post) => ({
      url: `https://sarang.dev/blog/${post.slug}`,
      lastModified: post.lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
