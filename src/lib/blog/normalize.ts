import { ArticleDocumentSchema, MAX_ARTICLE_DOCUMENT_BYTES, type ArticleDocument } from "./document";

function blockId(index: number) {
  return `legacy-${index + 1}`;
}

export function legacyParagraphsToDocument(content: readonly string[]): ArticleDocument {
  return {
    version: 1,
    layout: "field-note",
    blocks: content
      .map((text, index) => ({ id: blockId(index), type: "paragraph" as const, text: String(text).trim() }))
      .filter((block) => block.text.length > 0),
  };
}

export function parseArticleDocument(value: unknown, legacyContent: readonly string[] = []): ArticleDocument {
  if (typeof value === "string") {
    try {
      return ArticleDocumentSchema.parse(JSON.parse(value));
    } catch {
      return legacyParagraphsToDocument(legacyContent);
    }
  }
  const parsed = ArticleDocumentSchema.safeParse(value);
  return parsed.success ? parsed.data : legacyParagraphsToDocument(legacyContent);
}

export function documentToJson(document: ArticleDocument): string {
  const json = JSON.stringify(ArticleDocumentSchema.parse(document));
  if (new TextEncoder().encode(json).byteLength > MAX_ARTICLE_DOCUMENT_BYTES) {
    throw new Error("Article document is too large. Move large media or datasets into an asset.");
  }
  return json;
}
