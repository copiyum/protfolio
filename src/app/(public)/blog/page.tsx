import { getPublishedPostSummaries } from "@/lib/admin/read";
import type { Metadata } from "next";
import BlogList from "./BlogList";

export const metadata: Metadata = { title: "Blog", description: "Notes on design, motion, and the occasional bug." };
export const revalidate = 300;

export default async function BlogPage() {
  const posts = await getPublishedPostSummaries();

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      <div className="mx-auto max-w-[760px] px-5 py-12">
        <div className="mb-5">
          <p className="font-mono text-[10px] uppercase tracking-[.13em] text-[color:var(--foreground)]/45">Archive</p>
          <h1 className="mt-3 font-mono text-4xl font-bold tracking-[-.06em]">Field notes</h1>
          <p className="mt-3 max-w-lg font-mono text-sm leading-6 text-[color:var(--foreground)]/55">Notes on design, motion, and the occasional bug.</p>
        </div>

        <BlogList posts={posts} />
      </div>
    </div>
  );
}
