import { z } from "zod";

export const NavItemInput = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(50),
  href: z.string().regex(/^\//),
  sort_order: z.number().int().default(1000),
  visible: z.boolean().default(true),
});
export type NavItemInput = z.infer<typeof NavItemInput>;