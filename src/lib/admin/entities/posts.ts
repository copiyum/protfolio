import { posts as fallbackPosts, type Post } from "@/data/posts";
import { PostInput, type PostInput as PostInputType } from "../schema/posts";
import type { EntityPlugin } from "./types";

type PostRow = {
  slug: string;
  title: string;
  date: string;
  summary: string;
  cover: string | null;
  tags: string;
  content: string;
};

export const postsPlugin = {
  slug: "posts",
  label: "Posts",
  tag: "posts",
  schema: PostInput,
  db: {
    table: "posts",
    columns: ["id", "title", "slug", "date", "summary", "tags", "cover", "content", "published"],
    jsonColumns: ["tags", "content"],
    booleanColumns: ["published"],
    orderBy: "date DESC",
  },
  fallback: () => fallbackPosts,
  async read(db) {
    const rows = await db
      .prepare("SELECT slug, title, date, summary, cover, tags, content FROM posts WHERE published = 1 ORDER BY date DESC")
      .all<PostRow>();
    return rows.results.map((row) => ({
      slug: row.slug,
      title: row.title,
      date: row.date,
      summary: row.summary,
      cover: row.cover ?? undefined,
      tags: JSON.parse(row.tags) as string[],
      content: JSON.parse(row.content) as string[],
    }));
  },
  admin: {
    columns: [
      { key: "title", label: "Title" },
      { key: "slug", label: "Slug" },
      { key: "date", label: "Date" },
    ],
  },
} satisfies EntityPlugin<Post, PostInputType>;
