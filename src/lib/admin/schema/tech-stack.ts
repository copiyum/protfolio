import { z } from "zod";

export const TechInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  icon: z.string().max(20000).nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#9ca3af"),
  category: z.string().min(1).max(50),
  sort_order: z.number().int().default(1000),
  published: z.boolean().default(true),
});
export type TechInput = z.infer<typeof TechInput>;
