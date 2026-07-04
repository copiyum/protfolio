// Idempotent migration: src/data/*.ts → Cloudflare D1.
// Run with: `npm run migrate` after `npx wrangler login`.

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { posts } from "../src/data/posts";
import { projects } from "../src/data/projects";
import { experiences } from "../src/data/experience";
import { socialLinks } from "../src/data/social-links";
import { techStack } from "../src/data/tech-stack";
import { bentoCustomCell } from "../src/data/bento";

function readWranglerD1Value(key: "database_id" | "database_name"): string | undefined {
  try {
    const lines = readFileSync("wrangler.toml", "utf8").split(/\r?\n/);
    let inD1 = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      if (trimmed.startsWith("[[")) {
        inD1 = trimmed === "[[d1_databases]]";
        continue;
      }
      if (trimmed.startsWith("[")) {
        inD1 = false;
        continue;
      }
      if (!inD1) continue;
      const match = trimmed.match(/^([A-Za-z0-9_-]+)\s*=\s*"((?:\\"|[^"])*)"/);
      if (match?.[1] === key) return match[2].replace(/\\"/g, "\"");
    }
    return undefined;
  } catch {
    return undefined;
  }
}

const d1Name = process.env.CF_D1_NAME ?? process.env.CLOUDFLARE_D1_NAME ?? process.env.D1_DATABASE_NAME ?? readWranglerD1Value("database_name");
const d1Id = process.env.CF_D1_ID ?? process.env.CLOUDFLARE_D1_ID ?? process.env.D1_DATABASE_ID ?? readWranglerD1Value("database_id");
const isDryRun = process.argv.includes("--dry-run");
const isLocal = process.argv.includes("--local");
const printSql = process.argv.includes("--print-sql");

const missing = [
  d1Name ? null : "CF_D1_NAME, CLOUDFLARE_D1_NAME, D1_DATABASE_NAME, or database_name in wrangler.toml",
].filter(Boolean);

if (missing.length > 0) {
  console.error(`Missing env: ${missing.join("; ")}`);
  console.error("Example:");
  console.error("  npx wrangler login");
  console.error("  npm run migrate");
  process.exit(1);
}

const statements: string[] = [];

function sqlValue(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`Cannot serialize non-finite number: ${value}`);
    return String(value);
  }
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "string") return `'${value.replace(/'/g, "''")}'`;
  return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
}

function bindSql(sql: string, params: unknown[]): string {
  let i = 0;
  const bound = sql.replace(/\?/g, () => {
    if (i >= params.length) throw new Error(`Not enough params for SQL: ${sql}`);
    return sqlValue(params[i++]);
  });
  if (i !== params.length) throw new Error(`Too many params for SQL: ${sql}`);
  return `${bound.trim().replace(/;$/, "")};`;
}

async function exec(sql: string, params: unknown[] = []): Promise<void> {
  statements.push(bindSql(sql, params));
}

function runWranglerSqlFile(sql: string): void {
  const dir = mkdtempSync(join(tmpdir(), "pf-d1-migrate-"));
  const file = join(dir, "content.sql");
  writeFileSync(file, sql);
  if (isDryRun) {
    console.log(`Dry run: wrote ${statements.length} statements to ${file}`);
    if (printSql) console.log(sql);
    return;
  }

  const result = spawnSync(
    "npx",
    ["wrangler", "d1", "execute", d1Name as string, isLocal ? "--local" : "--remote", "--file", file, "--yes"],
    { stdio: "inherit" },
  );
  rmSync(dir, { recursive: true, force: true });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`wrangler d1 execute failed with exit code ${result.status}`);
}

async function main() {
  console.log(`Preparing migration for D1 ${d1Name}${d1Id ? ` (${d1Id})` : ""}...`);

  for (const p of posts) {
    await exec(
      `INSERT OR REPLACE INTO posts (id, title, slug, date, summary, tags, cover, content, published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [p.slug, p.title, p.slug, p.date, p.summary, JSON.stringify(p.tags), p.cover ?? null, JSON.stringify(p.content)],
    );
  }
  console.log(`  posts: ${posts.length}`);

  for (const p of projects) {
    await exec(
      `INSERT OR REPLACE INTO projects (id, title, period_start, period_end, link, logo, description, skills, featured, is_expanded, sort_order, published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        p.id,
        p.title,
        p.period.start,
        p.period.end ?? null,
        p.link ?? null,
        p.logo ?? null,
        p.description ?? null,
        JSON.stringify(p.skills),
        p.featured ? 1 : 0,
        p.isExpanded ? 1 : 0,
        1000,
      ],
    );
  }
  console.log(`  projects: ${projects.length}`);

  for (const e of experiences) {
    for (const pos of e.positions) {
      await exec(
        `INSERT OR REPLACE INTO experiences (
           id, company, company_logo, company_website, is_current_employer,
           role, employment_type, period_start, period_end, icon,
           description, skills, is_expanded, sort_order, published
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          pos.id,
          e.companyName,
          e.companyLogo ?? null,
          e.companyWebsite ?? null,
          e.isCurrentEmployer ? 1 : 0,
          pos.title,
          pos.employmentType ?? null,
          pos.employmentPeriod.start,
          pos.employmentPeriod.end ?? null,
          pos.iconImage ?? null,
          pos.description ?? null,
          JSON.stringify(pos.skills ?? []),
          pos.isExpanded ? 1 : 0,
          1000,
        ],
      );
    }
  }
  console.log(`  experiences: ${experiences.reduce((n, e) => n + e.positions.length, 0)}`);

  let sl = 0;
  for (const link of socialLinks) {
    const id = link.label.toLowerCase().replace(/\s+/g, "-");
    await exec(
      `INSERT OR REPLACE INTO social_links (id, label, href, sort_order, published) VALUES (?, ?, ?, ?, 1)`,
      [id, link.label, link.href, (sl += 1000)],
    );
  }
  console.log(`  social_links: ${socialLinks.length}`);

  let ts = 0;
  for (const t of techStack) {
    await exec(
      `INSERT OR REPLACE INTO tech_stack (id, name, icon, color, category, sort_order, published) VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [t.name.toLowerCase().replace(/\s+/g, "-"), t.name, t.svgContent, t.color, "Stack", (ts += 1000)],
    );
  }
  console.log(`  tech_stack: ${techStack.length}`);

  await exec(
    `INSERT OR REPLACE INTO bento_cells (id, kind, label, value, sub, payload, col_span, row_span, sort_order, visible)
     VALUES ('custom-currently', 'custom', ?, ?, ?, '{}', 1, 1, 1000, 1)`,
    [bentoCustomCell.label, bentoCustomCell.value, bentoCustomCell.sub],
  );
  console.log("  bento_cells: custom-currently");

  const navItems = [
    { id: "blog", label: "blog", href: "/blog", sort_order: 1000 },
    { id: "projects", label: "projects", href: "/projects", sort_order: 2000 },
    { id: "visitors", label: "visitors", href: "/visitors", sort_order: 3000 },
  ];
  for (const item of navItems) {
    await exec(
      `INSERT OR REPLACE INTO nav_items (id, label, href, sort_order, visible) VALUES (?, ?, ?, ?, 1)`,
      [item.id, item.label, item.href, item.sort_order],
    );
  }
  console.log(`  nav_items: ${navItems.length}`);

  await exec(
    `INSERT OR IGNORE INTO seo_defaults (id, title_template, description)
     VALUES ('singleton', '', '')`,
  );
  console.log("  seo_defaults: singleton initialized");

  runWranglerSqlFile(statements.join("\n\n"));
  console.log(isDryRun ? "Dry run complete." : "Migration complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
