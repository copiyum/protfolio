// One-shot migration: src/data/*.ts → Cloudflare D1.
// Run with: `npm run migrate` after exporting CF_ACCOUNT_ID, CF_D1_ID, CF_API_TOKEN.

import { posts } from "../src/data/posts";
import { projects } from "../src/data/projects";
import { experiences } from "../src/data/experience";
import { socialLinks } from "../src/data/social-links";
import { techStack } from "../src/data/tech-stack";

const { CF_ACCOUNT_ID, CF_D1_ID, CF_API_TOKEN } = process.env;
if (!CF_ACCOUNT_ID || !CF_D1_ID || !CF_API_TOKEN) {
  console.error("Missing env: CF_ACCOUNT_ID, CF_D1_ID, CF_API_TOKEN");
  process.exit(1);
}

async function exec(sql: string, params: unknown[] = []): Promise<void> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_D1_ID}/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${CF_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ sql, params }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`D1 ${res.status}: ${body}`);
  }
}

async function main() {
  console.log(`Migrating to D1 ${CF_D1_ID}…`);

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
        `INSERT OR REPLACE INTO experiences (id, company, role, employment_type, period_start, period_end, icon, description, skills, sort_order, published)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          pos.id,
          e.companyName,
          pos.title,
          pos.employmentType ?? null,
          pos.employmentPeriod.start,
          pos.employmentPeriod.end ?? null,
          pos.iconImage ?? null,
          pos.description ?? null,
          JSON.stringify(pos.skills ?? []),
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
      `INSERT OR REPLACE INTO tech_stack (id, name, icon, category, sort_order, published) VALUES (?, ?, ?, ?, ?, 1)`,
      [t.name.toLowerCase().replace(/\s+/g, "-"), t.name, t.svgContent, "Stack", (ts += 1000)],
    );
  }
  console.log(`  tech_stack: ${techStack.length}`);

  await exec(
    `INSERT OR IGNORE INTO seo_defaults (id, title_template, description)
     VALUES ('singleton', '', '')`,
  );
  console.log("  seo_defaults: singleton initialized");

  console.log("Migration complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});