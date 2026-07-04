import { z } from "zod";
import { OptionalHttpsUrl } from "./url";

export const ExperienceInput = z.object({
  id: z.string().min(1),
  company: z.string().min(1).max(200),
  company_logo: OptionalHttpsUrl,
  company_website: OptionalHttpsUrl,
  is_current_employer: z.boolean().default(false),
  role: z.string().min(1).max(200),
  employment_type: z.string().max(100).nullable().optional(),
  period_start: z.string().regex(/^(\d{4}|\d{2}\.\d{4})$/),
  period_end: z.string().regex(/^(\d{4}|\d{2}\.\d{4})$/).nullable().optional(),
  icon: OptionalHttpsUrl,
  description: z.string().max(2000).nullable().optional(),
  skills: z.array(z.string()).default([]),
  is_expanded: z.boolean().default(false),
  sort_order: z.number().int().default(1000),
  published: z.boolean().default(true),
});
export type ExperienceInput = z.infer<typeof ExperienceInput>;
