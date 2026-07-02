import { z } from "zod";

export const TechInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  icon: z.url().nullable().optional(),
  category: z.string().min(1).max(50),
  sort_order: z.number().int().default(1000),
  published: z.boolean().default(true),
});
export type TechInput = z.infer<typeof TechInput>;