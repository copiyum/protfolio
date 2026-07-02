import { z } from "zod";
import { HttpsUrl } from "./url";

export const SocialLinkInput = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(50),
  href: HttpsUrl,
  sort_order: z.number().int().default(1000),
  published: z.boolean().default(true),
});
export type SocialLinkInput = z.infer<typeof SocialLinkInput>;
