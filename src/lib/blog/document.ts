import { z } from "zod";

export const MAX_ARTICLE_DOCUMENT_BYTES = 512 * 1024;

const BlockId = z.string().min(1).max(120).regex(/^[a-zA-Z0-9_-]+$/, "Use letters, numbers, hyphens, or underscores");
const ShortText = z.string().trim().min(1).max(1_000);
const LongText = z.string().trim().min(1).max(20_000);

const BlockBase = z.object({ id: BlockId });

export const ParagraphBlockSchema = BlockBase.extend({ type: z.literal("paragraph"), text: LongText }).strict();
export const HeadingBlockSchema = BlockBase.extend({
  type: z.literal("heading"),
  level: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  text: ShortText,
  anchor: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/).optional(),
  marker: z.string().max(120).optional(),
}).strict();
export const CalloutBlockSchema = BlockBase.extend({
  type: z.literal("callout"),
  tone: z.enum(["note", "warning", "success", "critical"]).default("note"),
  title: z.string().trim().max(180).optional(),
  text: LongText,
}).strict();
export const QuoteBlockSchema = BlockBase.extend({
  type: z.literal("quote"),
  text: LongText,
  attribution: z.string().trim().max(300).optional(),
}).strict();
export const CodeBlockSchema = BlockBase.extend({
  type: z.literal("code"),
  language: z.string().trim().min(1).max(40),
  filename: z.string().trim().max(240).optional(),
  code: z.string().max(40_000),
  highlightLines: z.array(z.number().int().positive().max(10_000)).max(200).default([]),
}).strict();
export const ImageBlockSchema = BlockBase.extend({
  type: z.literal("image"),
  assetId: z.string().uuid(),
  alt: z.string().trim().min(1).max(500),
  caption: z.string().trim().max(1_000).optional(),
  wide: z.boolean().default(true),
}).strict();
export const TableBlockSchema = BlockBase.extend({
  type: z.literal("table"),
  headers: z.array(ShortText).min(1).max(12),
  rows: z.array(z.array(z.string().max(4_000)).min(1).max(12)).max(100),
  caption: z.string().trim().max(500).optional(),
}).strict().superRefine((value, ctx) => {
  value.rows.forEach((row, index) => {
    if (row.length !== value.headers.length) {
      ctx.addIssue({ code: "custom", path: ["rows", index], message: "Every table row must match the header count" });
    }
  });
});
export const DividerBlockSchema = BlockBase.extend({ type: z.literal("divider") }).strict();

export const ProofBoreholeDataSchema = z.object({
  caption: z.string().trim().max(500).default("Follow the evidence through each boundary."),
  scenarios: z.array(z.object({
    label: z.string().trim().min(1).max(80),
    verdict: z.string().trim().min(1).max(160),
    stages: z.array(z.object({
      name: z.string().trim().min(1).max(100),
      detail: z.string().trim().min(1).max(800),
      depth: z.string().trim().max(40).optional(),
    }).strict()).min(2).max(8),
  }).strict()).min(1).max(8).default([{ label: "Save", verdict: "A bounded path", stages: [
    { name: "Intent", detail: "The interface collects a constrained value.", depth: "0m" },
    { name: "Boundary", detail: "The action checks authority and origin.", depth: "15m" },
    { name: "Write", detail: "A prepared statement records the result.", depth: "30m" },
  ] }]),
}).strict();

export const RevisionRaceDataSchema = z.object({
  title: z.string().trim().max(140).default("Two tabs, one revision"),
  initialRevision: z.number().int().nonnegative().default(4),
  caption: z.string().trim().max(500).default("The second save detects the stale revision instead of overwriting it."),
}).strict();

export const OptimismLeaseDataSchema = z.object({
  title: z.string().trim().max(140).default("Optimism has a lease"),
  ttlSeconds: z.number().int().positive().max(86_400).default(60),
  caption: z.string().trim().max(500).default("A fresh assertion expires before a sensitive operation can run."),
}).strict();

export type ProofBoreholeData = z.infer<typeof ProofBoreholeDataSchema>;
export type RevisionRaceData = z.infer<typeof RevisionRaceDataSchema>;
export type OptimismLeaseData = z.infer<typeof OptimismLeaseDataSchema>;

function normalizeInteractiveData(kind: "proof-borehole" | "revision-race" | "optimism-lease", data: unknown) {
  if (kind === "proof-borehole") return ProofBoreholeDataSchema.parse(data);
  if (kind === "revision-race") return RevisionRaceDataSchema.parse(data);
  return OptimismLeaseDataSchema.parse(data);
}

export const InteractiveBlockSchema = BlockBase.extend({
  type: z.literal("interactive"),
  kind: z.enum(["proof-borehole", "revision-race", "optimism-lease"]),
  data: z.unknown(),
  caption: z.string().trim().max(1_000).optional(),
}).strict().superRefine((value, ctx) => {
  const schema = value.kind === "proof-borehole"
    ? ProofBoreholeDataSchema
    : value.kind === "revision-race"
      ? RevisionRaceDataSchema
      : OptimismLeaseDataSchema;
  const result = schema.safeParse(value.data);
  if (!result.success) {
    result.error.issues.forEach((issue) => ctx.addIssue({ ...issue, path: ["data", ...issue.path] }));
  }
});

export const ArticleBlockSchema = z.discriminatedUnion("type", [
  ParagraphBlockSchema,
  HeadingBlockSchema,
  CalloutBlockSchema,
  QuoteBlockSchema,
  CodeBlockSchema,
  ImageBlockSchema,
  TableBlockSchema,
  DividerBlockSchema,
  InteractiveBlockSchema,
]);

export const ArticleDocumentSchema = z.object({
  version: z.literal(1),
  layout: z.literal("field-note").default("field-note"),
  blocks: z.array(ArticleBlockSchema).max(300),
}).strict().superRefine((value, ctx) => {
  const ids = new Set<string>();
  const headingIds = new Set<string>();
  value.blocks.forEach((block, index) => {
    if (ids.has(block.id)) ctx.addIssue({ code: "custom", path: ["blocks", index, "id"], message: "Block ids must be unique" });
    ids.add(block.id);
    if (block.type === "heading") {
      const headingId = block.anchor ?? block.id;
      if (headingIds.has(headingId)) {
        ctx.addIssue({
          code: "custom",
          path: ["blocks", index, block.anchor ? "anchor" : "id"],
          message: "Heading anchors must be unique",
        });
      }
      headingIds.add(headingId);
    }
  });
}).transform((document) => ({
  ...document,
  blocks: document.blocks.map((block) => block.type === "interactive"
    ? { ...block, data: normalizeInteractiveData(block.kind, block.data) }
    : block) as Array<z.infer<typeof ArticleBlockSchema>>,
}));

export type ArticleDocument = z.infer<typeof ArticleDocumentSchema>;
export type ArticleBlock = z.infer<typeof ArticleBlockSchema>;
export type InteractiveBlock = Extract<ArticleBlock, { type: "interactive" }>;

export function parseInteractiveData(block: InteractiveBlock) {
  return normalizeInteractiveData(block.kind, block.data);
}

export function createEmptyDocument(): ArticleDocument {
  return {
    version: 1,
    layout: "field-note",
    blocks: [{ id: "intro", type: "paragraph", text: "Start writing here." }],
  };
}
