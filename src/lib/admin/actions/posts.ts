"use server";
import { defineCrud } from "./_crud";
import { PostInput } from "../schema/posts";

const cols = ["id", "title", "slug", "date", "summary", "tags", "cover", "content", "published"] as const;

const crud = defineCrud({
  table: "posts",
  tag: "posts",
  columns: cols,
  jsonColumns: ["tags", "content"],
  orderBy: "date DESC",
  schema: {
    parse: (i) => PostInput.parse(i),
    partial: () => ({
      parse: (i) => PostInput.partial().parse(i),
    }),
  },
});

export const listPosts = crud.list;
export const getPost = crud.get;
export const createPost = crud.create;
export const updatePost = crud.update;
export const deletePost = crud.remove;