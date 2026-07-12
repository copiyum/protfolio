import { z } from "zod";

const FORBIDDEN_SVG = /<(?:script|foreignObject|iframe|object|embed|style)\b|\bon[a-z]+\s*=|\b(?:href|xlink:href)\s*=|\bstyle\s*=|url\s*\(|@import|<!doctype|<\?xml/i;

export function isSafeSvgIcon(value: string): boolean {
  const markup = value.trim();
  return markup.startsWith("<svg") && markup.endsWith("</svg>") && !FORBIDDEN_SVG.test(markup);
}

export const TechInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  icon: z.string().max(20000).refine(isSafeSvgIcon, "SVG contains unsafe content").nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#9ca3af"),
  category: z.string().min(1).max(50),
  sort_order: z.number().int().default(1000),
  published: z.boolean().default(true),
});
export type TechInput = z.infer<typeof TechInput>;
