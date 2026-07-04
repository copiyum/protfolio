import { z } from "zod";
import { OptionalHttpsUrl } from "./url";

export const PostInput = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  summary: z.string().max(500).default(""),
  tags: z.array(z.string().min(1)).default([]),
  cover: OptionalHttpsUrl,
  content: z.array(z.string()).default([]),
  published: z.boolean().default(true),
});
export type PostInput = z.infer<typeof PostInput>;
