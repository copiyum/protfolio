import { z } from "zod";
import { OptionalHttpsUrl } from "./url";

export const SeoInput = z.object({
  title_template: z.string().max(200).default(""),
  og_image: OptionalHttpsUrl,
  description: z.string().max(500).default(""),
});
export type SeoInput = z.infer<typeof SeoInput>;
