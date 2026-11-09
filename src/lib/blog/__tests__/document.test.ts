import { describe, expect, it } from "vitest";
import { ArticleDocumentSchema } from "@/lib/blog/document";
import { documentToJson, legacyParagraphsToDocument, parseArticleDocument } from "@/lib/blog/normalize";
import { articlePlainText, extractHeadings, readingTimeMinutes } from "@/lib/blog/plain-text";

describe("blog documents", () => {
  it("adapts legacy paragraphs without changing their reading order", () => {
    const document = legacyParagraphsToDocument(["First", "", "Second"]);
    expect(document.blocks).toEqual([
      { id: "legacy-1", type: "paragraph", text: "First" },
      { id: "legacy-3", type: "paragraph", text: "Second" },
    ]);
  });

  it("rejects executable-shaped block data and duplicate block ids", () => {
    expect(() => ArticleDocumentSchema.parse({ version: 1, layout: "field-note", blocks: [
      { id: "same", type: "paragraph", text: "Safe prose", html: "<script>bad()</script>" },
      { id: "same", type: "divider" },
    ] })).toThrow();

    expect(() => ArticleDocumentSchema.parse({ version: 1, layout: "field-note", blocks: [
      { id: "first", type: "heading", level: 2, text: "First", anchor: "shared" },
      { id: "second", type: "heading", level: 2, text: "Second", anchor: "shared" },
    ] })).toThrow("Heading anchors must be unique");
  });

  it("extracts headings and searchable text from a valid document", () => {
    const document = parseArticleDocument({ version: 1, layout: "field-note", blocks: [
      { id: "intro", type: "paragraph", text: "A precise public explanation." },
      { id: "boundary", type: "heading", level: 2, text: "The boundary", anchor: "boundary", marker: "Layer II" },
    ] });
    expect(articlePlainText(document)).toContain("The boundary");
    expect(extractHeadings(document)).toEqual([{ id: "boundary", text: "The boundary", level: 2, marker: "Layer II" }]);
    expect(readingTimeMinutes(document)).toBe(1);
  });

  it("materializes safe defaults for interactive documents", () => {
    const document = ArticleDocumentSchema.parse({
      version: 1,
      layout: "field-note",
      blocks: [{ id: "race", type: "interactive", kind: "revision-race", data: {} }],
    });

    expect(document.blocks[0]).toMatchObject({
      type: "interactive",
      data: { title: "Two tabs, one revision", initialRevision: 4 },
    });
  });

  it("rejects documents whose serialized UTF-8 body exceeds the storage cap", () => {
    const document = ArticleDocumentSchema.parse({
      version: 1,
      layout: "field-note",
      blocks: Array.from({ length: 14 }, (_, index) => ({
        id: `paragraph-${index}`,
        type: "paragraph",
        text: "é".repeat(20_000),
      })),
    });

    expect(() => documentToJson(document)).toThrow("Article document is too large");
  });
});
