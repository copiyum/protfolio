// Backfill legacy post paragraph arrays into versioned block documents.
// Requires an existing `npx wrangler login` session. Preview before using --apply.
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ArticleDocumentSchema } from "../src/lib/blog/document";

const database = process.env.CF_D1_NAME ?? "pf-admin";
const apply = process.argv.includes("--apply");
const query = "SELECT id, title, slug, date, summary, tags, content, body FROM posts";
const read = spawnSync(
  "npx",
  ["wrangler", "d1", "execute", database, "--remote", "--command", query, "--json"],
  { encoding: "utf8" },
);
if (read.status !== 0) throw new Error(read.stderr || "Could not read posts from D1");

type LegacyPostRow = {
  id: string;
  title: string;
  slug: string;
  date: string;
  summary: string;
  tags: string;
  content: string;
  body: string | null;
};

const output = JSON.parse(read.stdout) as Array<{ results?: LegacyPostRow[] }>;
const rows = output.flatMap((item) => item.results ?? []);
const escape = (value: string) => `'${value.replace(/'/g, "''")}'`;

function stringArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

const sql = rows.map((row) => {
  const paragraphs = stringArray(row.content);
  const tags = stringArray(row.tags);
  let body = "";

  try {
    const parsed = ArticleDocumentSchema.safeParse(row.body ? JSON.parse(row.body) : null);
    if (parsed.success) body = JSON.stringify(parsed.data);
  } catch {
    // Fall through to the legacy paragraph adapter.
  }

  if (!body) {
    body = JSON.stringify({
      version: 1,
      layout: "field-note",
      blocks: paragraphs
        .filter((text) => text.trim())
        .map((text, index) => ({ id: `legacy-${index + 1}`, type: "paragraph", text: text.trim() })),
    });
  }
  return [
    `UPDATE posts SET body = CASE WHEN body IS NULL OR body = '' THEN ${escape(body)} ELSE body END, body_version = COALESCE(body_version, 1) WHERE id = ${escape(row.id)};`,
    `INSERT OR IGNORE INTO post_drafts (post_id, title, proposed_slug, date, summary, tags, body, body_version, revision, base_revision) VALUES (${escape(row.id)}, ${escape(row.title)}, ${escape(row.slug)}, ${escape(row.date)}, ${escape(row.summary)}, ${escape(JSON.stringify(tags))}, ${escape(body)}, 1, 0, 0);`,
  ].join("\n");
}).join("\n");

console.log(`Prepared published documents and drafts for ${rows.length} posts.`);
if (rows.length === 0) process.exit(0);
if (!apply) {
  console.log(sql);
  process.exit(0);
}

const dir = mkdtempSync(join(tmpdir(), "pf-blog-backfill-"));
const file = join(dir, "backfill.sql");
writeFileSync(file, sql);
const result = spawnSync(
  "npx",
  ["wrangler", "d1", "execute", database, "--remote", "--file", file, "--yes"],
  { stdio: "inherit" },
);
rmSync(dir, { recursive: true, force: true });
if (result.status !== 0) throw new Error("D1 backfill failed");
