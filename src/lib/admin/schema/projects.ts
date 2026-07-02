import { z } from "zod";
import { OptionalHttpsUrl } from "./url";

export const ProjectInput = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  period_start: z.string().regex(/^(\d{4}|\d{2}\.\d{4})$/),
  period_end: z.string().regex(/^(\d{4}|\d{2}\.\d{4})$/).nullable().optional(),
  link: OptionalHttpsUrl,
  logo: OptionalHttpsUrl,
  description: z.string().max(1000).nullable().optional(),
  skills: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  is_expanded: z.boolean().default(false),
  sort_order: z.number().int().default(1000),
  published: z.boolean().default(true),
});
export type ProjectInput = z.infer<typeof ProjectInput>;
