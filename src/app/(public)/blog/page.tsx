import AnimatedStars from "@/components/ui/animated-stars";
import { getPosts } from "@/lib/admin/read";
import BlogList from "./BlogList";

export const revalidate = 300;

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)]">
      <AnimatedStars />
      <div className="relative z-10 mx-auto max-w-[550px] px-4 py-8">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight">Blog</h1>
          <p className="mt-1 text-sm text-neutral-400">Notes on design, motion, and the occasional bug.</p>
        </div>

        <BlogList posts={posts} />
      </div>
    </div>
  );
}
