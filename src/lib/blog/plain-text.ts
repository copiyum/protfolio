import type { ArticleDocument } from "./document";

export type ArticleHeading = { id: string; text: string; level: 2 | 3 | 4; marker?: string };

export function articlePlainText(document: ArticleDocument): string {
  return document.blocks.map((block) => {
    switch (block.type) {
      case "paragraph": case "heading": case "callout": case "quote": return block.text;
      case "code": return block.code;
      case "image": return `${block.alt} ${block.caption ?? ""}`;
      case "table": return `${block.headers.join(" ")} ${block.rows.flat().join(" ")}`;
      case "interactive": return block.caption ?? "";
      default: return "";
    }
  }).join(" ").replace(/\s+/g, " ").trim();
}

export function readingTimeMinutes(document: ArticleDocument, wordsPerMinute = 200): number {
  const words = articlePlainText(document).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / wordsPerMinute));
}

export function extractHeadings(document: ArticleDocument): ArticleHeading[] {
  return document.blocks.flatMap((block) => block.type === "heading" ? [{
    id: block.anchor ?? block.id,
    text: block.text,
    level: block.level,
    marker: block.marker,
  }] : []);
}
