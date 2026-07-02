import { z } from "zod";

export const SeoInput = z.object({
  title_template: z.string().max(200).default(""),
  og_image: z.url().nullable().optional(),
  description: z.string().max(500).default(""),
});
export type SeoInput = z.infer<typeof SeoInput>;