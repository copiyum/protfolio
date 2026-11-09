import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleShell } from "@/components/blog/ArticleShell";
import { parseArticleDocument } from "@/lib/blog/normalize";
import { getPublishedPostBySlug, getPublishedPostSlugs } from "@/lib/admin/read";
import { OG_IMAGE, SITE_NAME } from "@/lib/site-metadata";

export const revalidate = 300;

export async function generateStaticParams() {
  return (await getPublishedPostSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) return { title: "Post not found" };
  const url = `/blog/${post.slug}`;
  const cover = post.coverAssetId ? `/media/blog/${post.coverAssetId}` : post.cover;
  const images = cover ? [{ url: cover, alt: post.title }] : [OG_IMAGE];
  return {
    title: post.title,
    description: post.summary,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      siteName: SITE_NAME,
      url,
      title: post.title,
      description: post.summary,
      publishedTime: post.publishedAt ?? post.date,
      tags: post.tags,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.summary,
      images: images.map((image) => image.url),
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) notFound();

  return <ArticleShell post={post} document={parseArticleDocument(post.body, post.content)} />;
}
