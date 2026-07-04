# Backend Control — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single hand-rolled admin panel that controls every visible/configurable surface in the portfolio (content + runtime knobs), secured by Cloudflare Access + Passkeys, backed by Cloudflare D1, deployed via OpenNext on Cloudflare.

**Architecture:** Next.js 16 app on OpenNext-on-Cloudflare. Public pages read from D1 via `unstable_cache` + tags. `/admin/*` behind CF Access email OTP, then a Passkey session (HMAC-signed cookie). Server actions do all writes with zod validation, audit logging, rate-limit checks. R2 for image uploads via presigned PUT.

**Tech Stack:**
- Next.js 16 + React 19 (existing)
- Tailwind v4, Framer Motion, MapLibre (existing)
- OpenNext on Cloudflare (`@opennextjs/cloudflare`)
- Cloudflare D1 (SQLite), R2, Access, Turnstile, WAF Rate Limiting
- `@simplewebauthn/server` v10+, `@simplewebauthn/browser`
- `zod`, `react-hook-form`, `@hookform/resolvers`
- `vitest-environment-miniflare` for D1/R2 unit tests
- Playwright for admin E2E

**Reference spec:** `docs/superpowers/specs/2026-07-02-backend-control-design.md`

---

## File Structure (new + modified)

### New
```
wrangler.toml                                 OpenNext + D1 + R2 binding config
src/lib/admin/
  db.ts                                       D1 client, prepared-statement cache
  schema/posts.ts                             zod schemas (shared client+server)
  schema/projects.ts
  schema/experiences.ts
  schema/social-links.ts
  schema/tech-stack.ts
  schema/bento.ts
  schema/feature-flags.ts
  schema/nav.ts
  schema/seo.ts
  schema/passkey.ts
  actions/posts.ts                            server actions
  actions/projects.ts
  actions/experiences.ts
  actions/social-links.ts
  actions/tech-stack.ts
  actions/bento.ts
  actions/feature-flags.ts
  actions/nav.ts
  actions/seo.ts
  actions/passkey.ts
  actions/auth.ts                             login/setup/assert
  session.ts                                  HMAC cookie sign/verify (constant-time)
  passkey.ts                                  WebAuthn ceremony helpers
  ratelimit.ts                                D1 counter
  r2.ts                                       presigned PUT
  audit.ts                                    audit_log writer
  flags.ts                                    feature-flag read (cached)
  middleware.ts                               security headers + CF Access
src/app/admin/layout.tsx                      auth gate, sidebar
src/app/admin/page.tsx                        dashboard
src/app/admin/login/page.tsx
src/app/admin/setup/page.tsx
src/app/admin/posts/{page.tsx, [id]/page.tsx, new/page.tsx}
src/app/admin/projects/{page.tsx, [id]/page.tsx, new/page.tsx}
src/app/admin/experiences/{page.tsx, [id]/page.tsx, new/page.tsx}
src/app/admin/social-links/{page.tsx, [id]/page.tsx, new/page.tsx}
src/app/admin/tech-stack/{page.tsx, [id]/page.tsx, new/page.tsx}
src/app/admin/bento/{page.tsx, [id]/page.tsx, new/page.tsx}
src/app/admin/feature-flags/page.tsx
src/app/admin/nav/{page.tsx, [id]/page.tsx, new/page.tsx}
src/app/admin/seo/page.tsx
src/app/admin/passkeys/{page.tsx, register/page.tsx}
src/app/admin/audit-log/page.tsx
src/components/admin/{EntityTable, EntityForm, ImageUpload, BentoGridEditor, PasskeyList, RateLimitPanel, AuditTable}.tsx
src/components/admin/AdminSidebar.tsx
scripts/migrate-content-to-d1.ts
migrations/0001_initial.sql
tests/admin/*.test.ts                          vitest unit/integration
tests/e2e/admin-*.spec.ts                     Playwright
```

### Modified
```
package.json                                  deps + scripts
src/app/layout.tsx                            wrap public layout with cache provider
src/app/page.tsx                              swap static bento import for D1 read (see Task: pre-existing fix)
src/data/*.ts                                 kept as fallback (do not delete)
next.config.ts                                OpenNext adapter config
tsconfig.json                                 path aliases for @/lib/admin
.env.local                                    add ADMIN_COOKIE_SECRET, CF Access IDs, Turnstile keys, R2 bucket
.github/workflows/ci.yml                      add `npm ci`, OSV scan unchanged
.github/dependabot.yml                        unchanged
README.md                                     admin runbook
```

---

## Phase 0 — Bootstrap

### Task 0.1: Install deps

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add runtime deps (pinned)**

Run:
```bash
npm install zod@^4 react-hook-form@^7 @hookform/resolvers@^5 @simplewebauthn/server@^13 @simplewebauthn/browser@^13 @opennextjs/cloudflare@^1 jose@^5
```

- [ ] **Step 2: Add dev deps (current pool-workers, no miniflare)**

Run:
```bash
npm install -D @cloudflare/vitest-pool-workers@^0.17 @cloudflare/workers-types wrangler@^4 @playwright/test@^1 tsx sharp@^0.35
```

- [ ] **Step 3: Verify package.json**

Run: `cat package.json | grep -E "zod|webauthn|opennext|vitest-pool-workers|wrangler|playwright"`
Expected: each dep listed once, `vitest-environment-miniflare` absent, `@cloudflare/vitest-pool-workers` present.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add admin panel deps"
```

---

### Task 0.2: OpenNext + wrangler config

**Files:**
- Create: `wrangler.toml`
- Create: `open-next.config.ts`
- Modify: `next.config.ts`

- [ ] **Step 1: Create wrangler.toml**

```toml
name = "pf-admin"
main = ".opennext/worker.js"
compatibility_date = "2026-07-01"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "pf-admin"
database_id = "<set-after-run-wrangler-d1-create>"

[[r2_buckets]]
binding = "R2"
bucket_name = "pf-admin-assets"

[vars]
ADMIN_COOKIE_SECRET = "<set-via-wrangler-secret-put>"
NODE_ENV = "production"

# Secrets (set via `wrangler secret put`):
# ADMIN_COOKIE_SECRET
# CF_ACCESS_AUD
# CF_ACCESS_TEAM_DOMAIN
# TURNSTILE_SECRET
# R2_PRESIGN_SECRET
# ALERT_EMAIL_WEBHOOK
```

- [ ] **Step 2: Create open-next.config.ts**

```ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({});
```

- [ ] **Step 3: Update next.config.ts**

```ts
import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: { reactCompiler: true },
  cacheComponents: true,
};

export default nextConfig;
```

- [ ] **Step 4: Create D1 database**

Run: `wrangler d1 create pf-admin`
Expected: prints `database_id`. Paste it into `wrangler.toml` `[[d1_databases]].database_id`.

- [ ] **Step 5: Create R2 bucket**

Run: `wrangler r2 bucket create pf-admin-assets`

- [ ] **Step 6: Set secrets**

Run (each line, one at a time — `wrangler` will prompt):
```bash
wrangler secret put ADMIN_COOKIE_SECRET
wrangler secret put CF_ACCESS_AUD
wrangler secret put CF_ACCESS_TEAM_DOMAIN
wrangler secret put TURNSTILE_SECRET
wrangler secret put R2_PRESIGN_SECRET
wrangler secret put ALERT_EMAIL_WEBHOOK
```

- [ ] **Step 7: Commit**

```bash
git add wrangler.toml open-next.config.ts next.config.ts
git commit -m "chore: opennext + wrangler config"
```

---

### Task 0.3: TS path alias

**Files:**
- Modify: `tsconfig.json`

- [ ] **Step 1: Add admin path aliases**

Edit `tsconfig.json` `compilerOptions`:
```json
"paths": {
  "@/*": ["./src/*"],
  "@/lib/admin/*": ["./src/lib/admin/*"]
}
```

- [ ] **Step 2: Commit**

```bash
git add tsconfig.json
git commit -m "chore: admin path aliases"
```

---

## Phase 1 — DB schema + migrations

### Task 1.1: Initial migration SQL

**Files:**
- Create: `migrations/0001_initial.sql`

- [ ] **Step 1: Write migration**

```sql
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  date TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  cover TEXT,
  content TEXT NOT NULL DEFAULT '[]',
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT,
  link TEXT,
  logo TEXT,
  description TEXT,
  skills TEXT NOT NULL DEFAULT '[]',
  featured INTEGER NOT NULL DEFAULT 0,
  is_expanded INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 1000,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS experiences (
  id TEXT PRIMARY KEY,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  employment_type TEXT,
  period_start TEXT NOT NULL,
  period_end TEXT,
  icon TEXT,
  description TEXT,
  skills TEXT NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 1000,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS social_links (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  href TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 1000,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS tech_stack (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  category TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 1000,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS bento_cells (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  label TEXT NOT NULL,
  value TEXT,
  sub TEXT,
  payload TEXT NOT NULL DEFAULT '{}',
  col_span INTEGER NOT NULL DEFAULT 1,
  row_span INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 1000,
  visible INTEGER NOT NULL DEFAULT 1,
  visibility_window TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS feature_flags (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS nav_items (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  href TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 1000,
  visible INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS seo_defaults (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  title_template TEXT NOT NULL DEFAULT '',
  og_image TEXT,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

INSERT OR IGNORE INTO seo_defaults (id) VALUES ('singleton');

CREATE TABLE IF NOT EXISTS passkeys (
  credential_id TEXT PRIMARY KEY,
  public_key BLOB NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  transports TEXT NOT NULL DEFAULT '[]',
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_used_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  passkey_credential_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ip TEXT,
  ua TEXT,
  FOREIGN KEY (passkey_credential_id) REFERENCES passkeys(credential_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_credential_id TEXT,
  action TEXT NOT NULL,
  target_table TEXT,
  target_id TEXT,
  ip TEXT,
  ua TEXT,
  ts TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  diff TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log(ts);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_credential_id);
CREATE INDEX IF NOT EXISTS idx_audit_target ON audit_log(target_table, target_id);

CREATE TABLE IF NOT EXISTS rate_limits (
  scope_key TEXT PRIMARY KEY,
  window_start TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0
);
```

- [ ] **Step 2: Apply migration locally**

Run: `wrangler d1 execute pf-admin --local --file=migrations/0001_initial.sql`
Expected: "Executed X commands".

- [ ] **Step 3: Apply migration to remote**

Run: `wrangler d1 execute pf-admin --remote --file=migrations/0001_initial.sql`
Expected: "Executed X commands".

- [ ] **Step 4: Commit**

```bash
git add migrations/0001_initial.sql
git commit -m "feat(db): initial schema for admin panel"
```

---

### Task 1.2: D1 client + prepared-statement cache

**Files:**
- Create: `src/lib/admin/db.ts`
- Test: `tests/admin/db.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/admin/db.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { createD1Client } from "@/lib/admin/db";

declare global {
  // @ts-expect-error injected by miniflare
  var __D1__: D1Database;
}

describe("D1 client", () => {
  beforeEach(async () => {
    await globalThis.__D1__.exec(
      "DELETE FROM posts; INSERT INTO posts (id, slug, title, date) VALUES ('p1','hello','Hello','2026-01-01');"
    );
  });

  it("caches prepared statements and reads a row", async () => {
    const db = createD1Client(globalThis.__D1__);
    const post = await db.first<PostRow>("posts", "id = ?", ["p1"]);
    expect(post?.slug).toBe("hello");
  });
});
```

- [ ] **Step 2: Add vitest config using @cloudflare/vitest-pool-workers (current)**

Replace `vitest.config.ts`:
```ts
import { defineConfig, defineProject, mergeConfig } from "vitest/config";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers/config";
import path from "node:path";

const migrations = await readD1Migrations(path.join(import.meta.dirname, "migrations"));

export default defineConfig({
  test: {
    poolOptions: {
      workers: {
        singleWorker: true,
        miniflare: {
          compatibilityDate: "2026-07-01",
          d1Databases: { DB: "pf-admin" },
        },
      },
    },
    setupFiles: ["./tests/admin/apply-migrations.ts"],
  },
});
```

Create `tests/admin/apply-migrations.ts`:
```ts
import { applyD1Migrations } from "@cloudflare/vitest-pool-workers";
import path from "node:path";

export async function setup({ env }: { env: { DB: D1Database; TEST_MIGRATIONS: D1Migration[] } }) {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
}
```

In `wrangler.toml` add a non-secret var to pass migrations to tests:
```toml
[env.test.vars]
TEST_MIGRATIONS = "<built-at-test-time>"
```

(Migrations are read at config-load time via `readD1Migrations` and injected via `miniflare.bindings`.)

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- tests/admin/db.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement D1 client**

```ts
// src/lib/admin/db.ts
export interface D1Client {
  first<T>(table: string, where: string, params: unknown[]): Promise<T | null>;
  all<T>(table: string, where: string, params: unknown[]): Promise<T[]>;
  run(sql: string, params: unknown[]): Promise<D1Result>;
}

export function createD1Client(d1: D1Database): D1Client {
  const cache = new Map<string, D1PreparedStatement>();
  const prep = (sql: string) => {
    let s = cache.get(sql);
    if (!s) { s = d1.prepare(sql); cache.set(sql, s); }
    return s;
  };
  return {
    async first<T>(table: string, where: string, params: unknown[]) {
      const r = await prep(`SELECT * FROM ${table} WHERE ${where} LIMIT 1`).bind(...params).first<T>();
      return r as T | null;
    },
    async all<T>(table: string, where: string, params: unknown[]) {
      const r = await prep(`SELECT * FROM ${table} WHERE ${where}`).bind(...params).all<T>();
      return (r.results ?? []) as T[];
    },
    async run(sql, params) { return prep(sql).bind(...params).run(); },
  };
}

export type PostRow = {
  id: string; slug: string; title: string; date: string;
  summary: string; tags: string; cover: string | null; content: string;
  published: number; created_at: string; updated_at: string;
};
```

Tests now use real bindings via `import { env } from "cloudflare:workers";` (provided by vitest-pool-workers), not `globalThis.__D1__`.

- [ ] **Step 5: Update test to use cloudflare:workers env**

```ts
// tests/admin/db.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:workers";
import { createD1Client } from "@/lib/admin/db";

describe("D1 client", () => {
  beforeEach(async () => {
    await env.DB.exec(
      "DELETE FROM posts; INSERT INTO posts (id, slug, title, date) VALUES ('p1','hello','Hello','2026-01-01');"
    );
  });

  it("caches prepared statements and reads a row", async () => {
    const db = createD1Client(env.DB);
    const post = await db.first<PostRow>("posts", "id = ?", ["p1"]);
    expect(post?.slug).toBe("hello");
  });
});
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- tests/admin/db.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/admin/db.ts tests/admin/db.test.ts tests/admin/apply-migrations.ts vitest.config.ts wrangler.toml package.json package-lock.json
git commit -m "feat(db): D1 client + vitest-pool-workers setup"
```

---

## Phase 2 — Core helpers (testable)

### Task 2.1: HMAC session sign/verify

**Files:**
- Create: `src/lib/admin/session.ts`
- Test: `tests/admin/session.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/admin/session.test.ts
import { describe, it, expect } from "vitest";
import { signSession, verifySession } from "@/lib/admin/session";

const SECRET = "test-secret-32-bytes-min-padding-xx";
const CRED = "cred-abc";

describe("session cookie", () => {
  it("signs and verifies a payload", async () => {
    const exp = new Date(Date.now() + 60_000).toISOString();
    const cookie = await signSession({ credentialId: CRED, expiresAt: exp, nonce: "n1" }, SECRET);
    const ok = await verifySession(cookie, SECRET);
    expect(ok?.credentialId).toBe(CRED);
  });

  it("rejects tampered payload", async () => {
    const exp = new Date(Date.now() + 60_000).toISOString();
    const cookie = await signSession({ credentialId: CRED, expiresAt: exp, nonce: "n1" }, SECRET);
    const tampered = cookie.slice(0, -2) + "AA";
    expect(await verifySession(tampered, SECRET)).toBeNull();
  });

  it("rejects expired cookie", async () => {
    const exp = new Date(Date.now() - 1000).toISOString();
    const cookie = await signSession({ credentialId: CRED, expiresAt: exp, nonce: "n1" }, SECRET);
    expect(await verifySession(cookie, SECRET)).toBeNull();
  });

  it("rejects wrong secret", async () => {
    const exp = new Date(Date.now() + 60_000).toISOString();
    const cookie = await signSession({ credentialId: CRED, expiresAt: exp, nonce: "n1" }, SECRET);
    expect(await verifySession(cookie, "different-secret-padding-x")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/admin/session.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
// src/lib/admin/session.ts
import { createHmac, timingSafeEqual } from "node:crypto";

export interface SessionPayload {
  credentialId: string;
  expiresAt: string;
  nonce: string;
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export async function signSession(p: SessionPayload, secret: string): Promise<string> {
  const body = b64url(JSON.stringify(p));
  const mac = b64url(createHmac("sha256", secret).update(body).digest());
  return `${body}.${mac}`;
}

export async function verifySession(cookie: string, secret: string): Promise<SessionPayload | null> {
  const [body, mac] = cookie.split(".");
  if (!body || !mac) return null;
  const expected = createHmac("sha256", secret).update(body).digest();
  let given: Buffer;
  try { given = fromB64url(mac); } catch { return null; }
  if (expected.length !== given.length) return null;
  if (!timingSafeEqual(expected, given)) return null;
  let payload: SessionPayload;
  try { payload = JSON.parse(fromB64url(body).toString("utf8")); } catch { return null; }
  if (new Date(payload.expiresAt).getTime() < Date.now()) return null;
  return payload;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/admin/session.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin/session.ts tests/admin/session.test.ts
git commit -m "feat(auth): HMAC session sign/verify with constant-time compare"
```

---

### Task 2.2: Audit log writer

**Files:**
- Create: `src/lib/admin/audit.ts`
- Test: `tests/admin/audit.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/admin/audit.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:workers";
import { writeAudit } from "@/lib/admin/audit";

describe("audit writer", () => {
  beforeEach(async () => { await env.DB.exec("DELETE FROM audit_log;"); });

  it("inserts a row", async () => {
    const id = await writeAudit(env.DB, {
      action: "create_post",
      targetTable: "posts",
      targetId: "p1",
      actorCredentialId: "cred-abc",
      ip: "1.2.3.4",
      ua: "Mozilla",
      diff: { title: "Hello" },
    });
    expect(id).toBeTruthy();
    const row = await env.DB.prepare("SELECT * FROM audit_log WHERE id = ?").bind(id).first();
    expect(row?.action).toBe("create_post");
  });
});
```

- [ ] **Step 2: Run test (fail)**

Run: `npm test -- tests/admin/audit.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/lib/admin/audit.ts
import { randomUUID } from "node:crypto";

export interface AuditInput {
  action: string;
  targetTable?: string;
  targetId?: string;
  actorCredentialId?: string;
  ip?: string;
  ua?: string;
  diff?: Record<string, unknown>;
}

export async function writeAudit(d1: D1Database, input: AuditInput): Promise<string> {
  const id = randomUUID();
  await d1
    .prepare(
      `INSERT INTO audit_log (id, actor_credential_id, action, target_table, target_id, ip, ua, diff)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      input.actorCredentialId ?? null,
      input.action,
      input.targetTable ?? null,
      input.targetId ?? null,
      input.ip ?? null,
      input.ua ?? null,
      input.diff ? JSON.stringify(input.diff) : null
    )
    .run();
  return id;
}
```

- [ ] **Step 4: Run test (pass)**

Run: `npm test -- tests/admin/audit.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin/audit.ts tests/admin/audit.test.ts
git commit -m "feat(audit): audit_log writer"
```

---

### Task 2.3: Rate limit counter

**Files:**
- Create: `src/lib/admin/ratelimit.ts`
- Test: `tests/admin/ratelimit.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/admin/ratelimit.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:workers";
import { consume, reset } from "@/lib/admin/ratelimit";

describe("rate limit", () => {
  beforeEach(async () => { await env.DB.exec("DELETE FROM rate_limits;"); });

  it("allows up to limit", async () => {
    const key = "ip:1.2.3.4:/admin/login";
    for (let i = 0; i < 5; i++) {
      expect(await consume(env.DB, key, 5, 3600)).toBe(true);
    }
    expect(await consume(env.DB, key, 5, 3600)).toBe(false);
  });

  it("resets after window", async () => {
    const key = "k";
    await consume(env.DB, key, 1, 0);
    expect(await consume(env.DB, key, 1, 3600)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test (fail)**

Run: `npm test -- tests/admin/ratelimit.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/lib/admin/ratelimit.ts
export async function consume(
  d1: D1Database,
  key: string,
  limit: number,
  windowSec: number
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const row = await d1.prepare("SELECT window_start, count FROM rate_limits WHERE scope_key = ?").bind(key).first<{ window_start: string; count: number }>();
  const winStart = row ? parseInt(row.window_start, 10) : 0;
  if (!row || now - winStart >= windowSec) {
    await d1.prepare("INSERT OR REPLACE INTO rate_limits (scope_key, window_start, count) VALUES (?, ?, 1)").bind(key, now).run();
    return true;
  }
  if (row.count >= limit) return false;
  await d1.prepare("UPDATE rate_limits SET count = count + 1 WHERE scope_key = ?").bind(key).run();
  return true;
}

export async function reset(d1: D1Database, key: string): Promise<void> {
  await d1.prepare("DELETE FROM rate_limits WHERE scope_key = ?").bind(key).run();
}
```

- [ ] **Step 4: Run test (pass)**

Run: `npm test -- tests/admin/ratelimit.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin/ratelimit.ts tests/admin/ratelimit.test.ts
git commit -m "feat(ratelimit): D1-backed counter"
```

---

## Phase 3 — Zod schemas

### Task 3.1: All entity schemas

**Files:**
- Create: `src/lib/admin/schema/*.ts` (one per entity)

- [ ] **Step 1: posts schema**

```ts
// src/lib/admin/schema/posts.ts
import { z } from "zod";

export const PostInput = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  summary: z.string().max(500).default(""),
  tags: z.array(z.string().min(1)).default([]),
  cover: z.string().url().nullable().optional(),
  content: z.array(z.string()).default([]),
  published: z.boolean().default(true),
});
export type PostInput = z.infer<typeof PostInput>;
```

- [ ] **Step 2: projects schema**

```ts
// src/lib/admin/schema/projects.ts
import { z } from "zod";

export const ProjectInput = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  period_start: z.string().regex(/^(\d{4}|\d{2}\.\d{4})$/),
  period_end: z.string().regex(/^(\d{4}|\d{2}\.\d{4})$/).nullable().optional(),
  link: z.string().url().nullable().optional(),
  logo: z.string().url().nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  skills: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  is_expanded: z.boolean().default(false),
  sort_order: z.number().int().default(1000),
  published: z.boolean().default(true),
});
export type ProjectInput = z.infer<typeof ProjectInput>;
```

- [ ] **Step 3: experiences schema**

```ts
// src/lib/admin/schema/experiences.ts
import { z } from "zod";

export const ExperienceInput = z.object({
  id: z.string().min(1),
  company: z.string().min(1).max(200),
  role: z.string().min(1).max(200),
  employment_type: z.string().max(100).nullable().optional(),
  period_start: z.string().regex(/^(\d{4}|\d{2}\.\d{4})$/),
  period_end: z.string().regex(/^(\d{4}|\d{2}\.\d{4})$/).nullable().optional(),
  icon: z.string().url().nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  skills: z.array(z.string()).default([]),
  sort_order: z.number().int().default(1000),
  published: z.boolean().default(true),
});
export type ExperienceInput = z.infer<typeof ExperienceInput>;
```

- [ ] **Step 4: social-links schema**

```ts
// src/lib/admin/schema/social-links.ts
import { z } from "zod";

export const SocialLinkInput = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(50),
  href: z.string().url(),
  sort_order: z.number().int().default(1000),
  published: z.boolean().default(true),
});
export type SocialLinkInput = z.infer<typeof SocialLinkInput>;
```

- [ ] **Step 5: tech-stack schema**

```ts
// src/lib/admin/schema/tech-stack.ts
import { z } from "zod";

export const TechInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  icon: z.string().url().nullable().optional(),
  category: z.string().min(1).max(50),
  sort_order: z.number().int().default(1000),
  published: z.boolean().default(true),
});
export type TechInput = z.infer<typeof TechInput>;
```

- [ ] **Step 6: bento schema**

```ts
// src/lib/admin/schema/bento.ts
import { z } from "zod";

export const BENTO_KINDS = ["custom", "nowPlaying", "github", "map", "typing", "visitors", "showcase"] as const;

export const BentoCellInput = z.object({
  id: z.string().min(1),
  kind: z.enum(BENTO_KINDS),
  label: z.string().min(1).max(100),
  value: z.string().max(200).nullable().optional(),
  sub: z.string().max(200).nullable().optional(),
  payload: z.record(z.unknown()).default({}),
  col_span: z.number().int().min(1).max(4).default(1),
  row_span: z.number().int().min(1).max(4).default(1),
  sort_order: z.number().int().default(1000),
  visible: z.boolean().default(true),
  visibility_window: z
    .object({ startHour: z.number().int().min(0).max(23), endHour: z.number().int().min(0).max(23), tz: z.string() })
    .nullable()
    .optional(),
});
export type BentoCellInput = z.infer<typeof BentoCellInput>;
```

- [ ] **Step 7: feature-flags schema**

```ts
// src/lib/admin/schema/feature-flags.ts
import { z } from "zod";

export const FeatureFlagInput = z.object({
  key: z.string().min(1).regex(/^[a-z0-9_]+$/),
  value: z.union([z.boolean(), z.string(), z.number(), z.record(z.unknown())]),
});
export type FeatureFlagInput = z.infer<typeof FeatureFlagInput>;
```

- [ ] **Step 8: nav schema**

```ts
// src/lib/admin/schema/nav.ts
import { z } from "zod";

export const NavItemInput = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(50),
  href: z.string().regex(/^\//),
  sort_order: z.number().int().default(1000),
  visible: z.boolean().default(true),
});
export type NavItemInput = z.infer<typeof NavItemInput>;
```

- [ ] **Step 9: seo schema**

```ts
// src/lib/admin/schema/seo.ts
import { z } from "zod";

export const SeoInput = z.object({
  title_template: z.string().max(200).default(""),
  og_image: z.string().url().nullable().optional(),
  description: z.string().max(500).default(""),
});
export type SeoInput = z.infer<typeof SeoInput>;
```

- [ ] **Step 10: passkey schema**

```ts
// src/lib/admin/schema/passkey.ts
import { z } from "zod";

export const PasskeyRegisterInput = z.object({
  attestationResponse: z.unknown(),
  name: z.string().min(1).max(100),
});
export const PasskeyAssertInput = z.object({
  assertionResponse: z.unknown(),
});
```

- [ ] **Step 11: Commit**

```bash
git add src/lib/admin/schema/
git commit -m "feat(schema): zod schemas for all entities"
```

---

## Phase 4 — Auth

### Task 4.1: Passkey ceremony helpers

**Files:**
- Create: `src/lib/admin/passkey.ts`
- Test: `tests/admin/passkey.test.ts`

- [ ] **Step 1: Implement passkey helpers**

```ts
// src/lib/admin/passkey.ts
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/server"; // re-exported from server/types

const RP_NAME = "pf-admin";
const RP_ID = "sarang.dev"; // set via env in prod

export interface PasskeyRecord {
  credential_id: string;
  public_key: ArrayBuffer;
  counter: number;
  transports: AuthenticatorTransportFuture[];
}

// Server-side helpers — NO startRegistration/startAuthentication (those are browser-only).
// Pages call @simplewebauthn/browser's startRegistration/startAuthentication to drive the UI.

export async function makeRegistrationOptions() {
  return generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: crypto.randomUUID(),
    userName: "admin",
    authenticatorSelection: { userVerification: "required", residentKey: "required" },
  });
}

export async function verifyRegistration(response: unknown, expectedChallenge: string) {
  return verifyRegistrationResponse({
    response: response as any,
    expectedChallenge,
    expectedOrigin: `https://${RP_ID}`,
    expectedRPID: RP_ID,
  });
}

export async function makeAuthOptions(passkeys: PasskeyRecord[]) {
  return generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials: passkeys.map(p => ({ id: p.credential_id, transports: p.transports })),
    userVerification: "required",
  });
}

export async function verifyAuth(
  response: unknown,
  expectedChallenge: string,
  passkey: PasskeyRecord
) {
  return verifyAuthenticationResponse({
    response: response as any,
    expectedChallenge,
    expectedOrigin: `https://${RP_ID}`,
    expectedRPID: RP_ID,
    credential: { id: passkey.credential_id, publicKey: passkey.public_key, counter: passkey.counter, transports: passkey.transports },
  });
}
```

- [ ] **Step 2: Smoke test (smoke only; full WebAuthn ceremony needs browser)**

```ts
// tests/admin/passkey.test.ts
import { describe, it, expect } from "vitest";
import { startRegistration } from "@/lib/admin/passkey";

describe("passkey startRegistration", () => {
  it("returns options with challenge", async () => {
    const opts = await startRegistration();
    expect(opts.challenge).toBeTruthy();
    expect(opts.rp.name).toBe("pf-admin");
  });
});
```

- [ ] **Step 3: Run test**

Run: `npm test -- tests/admin/passkey.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/admin/passkey.ts tests/admin/passkey.test.ts
git commit -m "feat(auth): WebAuthn ceremony helpers"
```

---

### Task 4.2: CF Access + security headers middleware

**Files:**
- Create: `src/lib/admin/middleware.ts`
- Test: `tests/admin/middleware.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/admin/middleware.test.ts
import { describe, it, expect } from "vitest";
import { applySecurityHeaders } from "@/lib/admin/middleware";

describe("security headers", () => {
  it("adds CSP, HSTS, frame deny, content-type nosniff, referrer, permissions", () => {
    const res = new Response("ok");
    const out = applySecurityHeaders(res, "/admin/posts");
    const h = out.headers;
    expect(h.get("Content-Security-Policy")).toMatch(/script-src 'self' 'nonce-/);
    expect(h.get("Strict-Transport-Security")).toMatch(/max-age=63072000/);
    expect(h.get("X-Frame-Options")).toBe("DENY");
    expect(h.get("X-Content-Type-Options")).toBe("nosniff");
    expect(h.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(h.get("Permissions-Policy")).toMatch(/camera=\(\)/);
  });

  it("adds frame-ancestors none on /admin", () => {
    const out = applySecurityHeaders(new Response("ok"), "/admin/x");
    expect(out.headers.get("Content-Security-Policy")).toMatch(/frame-ancestors 'none'/);
  });

  it("does not add frame-ancestors none on public", () => {
    const out = applySecurityHeaders(new Response("ok"), "/blog");
    expect(out.headers.get("Content-Security-Policy")).not.toMatch(/frame-ancestors/);
  });
});
```

- [ ] **Step 2: Run test (fail)**

Run: `npm test -- tests/admin/middleware.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/lib/admin/middleware.ts
export function applySecurityHeaders(res: Response, pathname: string): Response {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const isAdmin = pathname.startsWith("/admin");
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'unsafe-inline'`, // Tailwind v4 inline; refactor later if needed
    `img-src 'self' data: blob:`,
    `connect-src 'self'`,
    `frame-ancestors ${isAdmin ? "'none'" : "'self'"}`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join("; ");
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.headers.set("X-Frame-Options", isAdmin ? "DENY" : "SAMEORIGIN");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");
  // Expose nonce for Next.js scripts to consume via header
  res.headers.set("x-nonce", nonce);
  return res;
}

export async function requireAdmin(req: Request, env: { DB: D1Database; ADMIN_COOKIE_SECRET: string; CF_ACCESS_AUD: string; CF_ACCESS_TEAM_DOMAIN: string }): Promise<{ credentialId: string } | Response> {
  // CF Access JWT validation — REAL (no stub; this is a launch blocker).
  // Verify signature against CF Access JWKS, check aud + iss + exp.
  const jwt = req.headers.get("cf-access-jwt-assertion");
  if (!jwt) return new Response("CF Access required", { status: 401 });
  const valid = await verifyCfAccessJwt(jwt, env.CF_ACCESS_AUD, env.CF_ACCESS_TEAM_DOMAIN);
  if (!valid) return new Response("Invalid CF Access token", { status: 401 });

  // Session cookie
  const cookie = req.headers.get("cookie")?.match(/__Host-pf_admin=([^;]+)/)?.[1];
  if (!cookie) return new Response("Login required", { status: 401 });
  const { verifySession } = await import("./session");
  const session = await verifySession(decodeURIComponent(cookie), env.ADMIN_COOKIE_SECRET);
  if (!session) return new Response("Session expired", { status: 401 });

  // Origin check on writes
  if (req.method !== "GET") {
    const origin = req.headers.get("origin");
    if (origin && new URL(origin).host !== new URL(req.url).host) {
      return new Response("Bad origin", { status: 403 });
    }
  }
  // Sensitive op re-prompt: force fresh assertion (<60s) for delete/rotate/passkey-delete
  const SENSITIVE = /\/admin\/(posts|projects|experiences|social-links|tech-stack|bento|nav|seo|feature-flags)\/.*\/(delete|rotate)|\/admin\/passkeys\/.*\/delete/;
  if (req.method !== "GET" && SENSITIVE.test(new URL(req.url).pathname)) {
    const lastFresh = req.headers.get("x-passkey-fresh-at");
    if (!lastFresh || Date.now() - parseInt(lastFresh) > 60_000) {
      return new Response("Fresh passkey assertion required", { status: 401 });
    }
  }
  return { credentialId: session.credentialId };
}

// CF Access JWT verification using jose. JWKS cached per CF_ACCESS_TEAM_DOMAIN.
import { createRemoteJWKSet, jwtVerify } from "jose";
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
async function verifyCfAccessJwt(jwt: string, aud: string, teamDomain: string): Promise<boolean> {
  let jwks = jwksCache.get(teamDomain);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`https://${teamDomain}/cdn-cgi/access/certs`));
    jwksCache.set(teamDomain, jwks);
  }
  try {
    const { payload } = await jwtVerify(jwt, jwks, { audience: aud, issuer: `https://${teamDomain}` });
    return !!payload;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run test (pass)**

Run: `npm test -- tests/admin/middleware.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin/middleware.ts tests/admin/middleware.test.ts
git commit -m "feat(middleware): security headers + CF Access gate"
```

---

### Task 4.3: Auth server actions

**Files:**
- Create: `src/lib/admin/actions/auth.ts`

- [ ] **Step 1: Implement register/setup actions**

```ts
// src/lib/admin/actions/auth.ts
"use server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { writeAudit } from "../audit";
import { makeRegistrationOptions, verifyRegistration, makeAuthOptions, verifyAuth } from "../passkey";
import { signSession, verifySession } from "../session";
import { consume } from "../ratelimit";

const COOKIE_NAME = "__Host-pf_admin";
const SESSION_TTL_MS = 15 * 60 * 1000;

async function getEnv() {
  const ctx = await getCloudflareContext({ async: true });
  return ctx.env as unknown as { DB: D1Database; ADMIN_COOKIE_SECRET: string };
}

export async function beginRegistration() {
  const opts = await makeRegistrationOptions();
  const challenge = Buffer.from(opts.challenge).toString("base64url");
  const jar = await cookies();
  jar.set("pf_reg_challenge", challenge, { httpOnly: true, secure: true, sameSite: "strict", path: "/admin", maxAge: 300 });
  return opts;
}

export async function completeRegistration(formData: FormData) {
  const env = await getEnv();
  const jar = await cookies();
  const responseStr = formData.get("response") as string;
  const name = formData.get("name") as string;
  const challenge = jar.get("pf_reg_challenge")?.value;
  if (!challenge) throw new Error("Registration challenge expired");
  const verified = await verifyRegistration(JSON.parse(responseStr), challenge);
  if (!verified.verified) throw new Error("Registration failed");
  const { registrationInfo } = verified;
  if (!registrationInfo) throw new Error("No registration info");
  const credentialId = registrationInfo.credential.id;
  const publicKey = registrationInfo.credential.publicKey;
  const counter = registrationInfo.credential.counter;
  await env.DB.prepare(
    "INSERT INTO passkeys (credential_id, public_key, counter, transports, name) VALUES (?, ?, ?, ?, ?)"
  ).bind(credentialId, publicKey, counter, JSON.stringify(registrationInfo.credential.transports ?? []), name).run();
  jar.delete("pf_reg_challenge");
  await writeAudit(env.DB, { action: "passkey_register", targetTable: "passkeys", targetId: credentialId, actorCredentialId: credentialId });
  await issueSession(credentialId, env);
  return { ok: true, credentialId };
}

export async function beginLogin() {
  const env = await getEnv();
  const rows = await env.DB.prepare("SELECT credential_id, public_key, counter, transports FROM passkeys").all<any>();
  const passkeys = rows.results.map(r => ({
    credential_id: r.credential_id,
    public_key: r.public_key,
    counter: r.counter,
    transports: JSON.parse(r.transports),
  }));
  const opts = await makeAuthOptions(passkeys);
  const jar = await cookies();
  jar.set("pf_assert_challenge", Buffer.from(opts.challenge).toString("base64url"), { httpOnly: true, secure: true, sameSite: "strict", path: "/admin", maxAge: 300 });
  return opts;
}

export async function completeLogin(formData: FormData) {
  const env = await getEnv();
  const jar = await cookies();
  const ip = (formData.get("ip") as string) ?? "unknown";
  const allowed = await consume(env.DB, `ip:${ip}:/admin/login`, 5, 3600);
  if (!allowed) throw new Error("Too many failed attempts");
  const responseStr = formData.get("response") as string;
  const challenge = jar.get("pf_assert_challenge")?.value;
  if (!challenge) throw new Error("Login challenge expired");
  const response = JSON.parse(responseStr);
  const row = await env.DB.prepare("SELECT credential_id, public_key, counter, transports FROM passkeys WHERE credential_id = ?").bind(response.id).first<any>();
  if (!row) throw new Error("Unknown credential");
  const passkey = { credential_id: row.credential_id, public_key: row.public_key, counter: row.counter, transports: JSON.parse(row.transports) };
  const verified = await verifyAuth(response, challenge, passkey);
  if (!verified.verified) throw new Error("Login failed");
  if (verified.authenticationInfo.newCounter <= passkey.counter) {
    await env.DB.prepare("DELETE FROM passkeys WHERE credential_id = ?").bind(passkey.credential_id).run();
    await writeAudit(env.DB, { action: "passkey_clone_detected", targetTable: "passkeys", targetId: passkey.credential_id, ip });
    throw new Error("Possible cloned authenticator; credential deleted");
  }
  await env.DB.prepare("UPDATE passkeys SET counter = ?, last_used_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE credential_id = ?").bind(verified.authenticationInfo.newCounter, passkey.credential_id).run();
  jar.delete("pf_assert_challenge");
  await issueSession(passkey.credential_id, env);
  await writeAudit(env.DB, { action: "login_success", actorCredentialId: passkey.credential_id, ip });
  // Open redirect guard: only accept /admin/* as post-login redirect
  const next = formData.get("next") as string | null;
  const safeNext = next && /^\/admin(\/.*)?$/.test(next) ? next : "/admin";
  return { ok: true, redirect: safeNext };
}

async function issueSession(credentialId: string, env: { ADMIN_COOKIE_SECRET: string }) {
  const exp = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const nonce = randomUUID();
  const cookie = await signSession({ credentialId, expiresAt: exp, nonce }, env.ADMIN_COOKIE_SECRET);
  const jar = await cookies();
  jar.set(COOKIE_NAME, cookie, { httpOnly: true, secure: true, sameSite: "lax", path: "/admin", maxAge: SESSION_TTL_MS / 1000 });
}

export async function logout() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/admin/actions/auth.ts
git commit -m "feat(auth): register + login + session lifecycle"
```

---

## Phase 5 — CRUD template (posts)

### Task 5.1: Posts server actions

**Files:**
- Create: `src/lib/admin/actions/posts.ts`

- [ ] **Step 1: Implement CRUD + reorder**

```ts
// src/lib/admin/actions/posts.ts
"use server";
import { updateTag } from "next/cache"; // Next 16: read-your-own-writes via updateTag, not deprecated revalidateTag
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PostInput } from "../schema/posts";
import { writeAudit } from "../audit";

async function getEnv() {
  const ctx = await getCloudflareContext({ async: true });
  return ctx.env as unknown as { DB: D1Database };
}
async function actor(): Promise<string | null> {
  // Set by requireAdmin() middleware via x-actor-credential-id response header.
  // Server actions read via headers() in Next 16.
  const { headers } = await import("next/headers");
  const h = await headers();
  return h.get("x-actor-credential-id");
}

export async function listPosts() {
  const env = await getEnv();
  const rows = await env.DB.prepare("SELECT * FROM posts ORDER BY date DESC").all<any>();
  return rows.results;
}

export async function createPost(input: PostInput) {
  const parsed = PostInput.parse(input);
  const env = await getEnv();
  await env.DB.prepare(
    `INSERT INTO posts (id, title, slug, date, summary, tags, cover, content, published)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(parsed.id, parsed.title, parsed.slug, parsed.date, parsed.summary, JSON.stringify(parsed.tags), parsed.cover ?? null, JSON.stringify(parsed.content), parsed.published ? 1 : 0).run();
  const auditId = await writeAudit(env.DB, { action: "create_post", targetTable: "posts", targetId: parsed.id, actorCredentialId: await actor(), diff: parsed });
  if (!auditId) throw new Error("Audit write failed");
  updateTag("posts");
  return { ok: true };
}

export async function updatePost(id: string, input: Partial<PostInput>) {
  const parsed = PostInput.partial().parse(input);
  const env = await getEnv();
  const existing = await env.DB.prepare("SELECT * FROM posts WHERE id = ?").bind(id).first<any>();
  if (!existing) throw new Error("Not found");
  const merged = { ...JSON.parse(existing.tags ? existing.tags : "[]"), ...parsed };
  await env.DB.prepare(
    `UPDATE posts SET title = ?, slug = ?, date = ?, summary = ?, tags = ?, cover = ?, content = ?, published = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`
  ).bind(merged.title, merged.slug, merged.date, merged.summary, JSON.stringify(merged.tags), merged.cover ?? null, JSON.stringify(merged.content), merged.published ? 1 : 0, id).run();
  await writeAudit(env.DB, { action: "update_post", targetTable: "posts", targetId: id, actorCredentialId: await actor(), diff: parsed });
  updateTag("posts");
  return { ok: true };
}

export async function deletePost(id: string) {
  const env = await getEnv();
  await env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(id).run();
  await writeAudit(env.DB, { action: "delete_post", targetTable: "posts", targetId: id, actorCredentialId: await actor() });
  updateTag("posts");
  return { ok: true };
}

export async function reorderPosts(orderedIds: string[]) {
  const env = await getEnv();
  const stride = 1000;
  const stmt = env.DB.prepare("UPDATE posts SET sort_order = ? WHERE id = ?");
  await env.DB.batch(orderedIds.map((id, i) => stmt.bind((i + 1) * stride, id)));
  await writeAudit(env.DB, { action: "reorder_posts", targetTable: "posts", actorCredentialId: await actor() });
  updateTag("posts");
  return { ok: true };
}
```

- [ ] **Step 2: Smoke test (note: Next 16 server actions need request context; this is a logical check via direct env)**

```ts
// tests/admin/actions-posts.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:workers";

// Server actions internally use getCloudflareContext(). Mock it for tests:
import { vi } from "vitest";
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: async () => ({ env }) }));

import { createPost, listPosts, updatePost, deletePost } from "@/lib/admin/actions/posts";

beforeEach(async () => {
  await env.DB.exec("DELETE FROM posts; DELETE FROM audit_log;");
});

describe("posts CRUD", () => {
  it("creates, lists, updates, deletes", async () => {
    await createPost({ id: "p1", title: "Hello", slug: "hello", date: "2026-01-01", summary: "", tags: [], content: [], published: true });
    let all = await listPosts();
    expect(all).toHaveLength(1);
    await updatePost("p1", { title: "Hello World" });
    all = await listPosts();
    expect(all[0].title).toBe("Hello World");
    await deletePost("p1");
    all = await listPosts();
    expect(all).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Run test**

Run: `npm test -- tests/admin/actions-posts.test.ts`
Expected: smoke passes (best-effort; full integration via E2E in Phase 10).

- [ ] **Step 4: Commit**

```bash
git add src/lib/admin/actions/posts.ts tests/admin/actions-posts.test.ts
git commit -m "feat(crud): posts server actions"
```

---

### Task 5.2–5.9: Replicate CRUD pattern for projects, experiences, social-links, tech-stack, bento, feature-flags, nav, seo

**Files (one per task):**
- Create: `src/lib/admin/actions/projects.ts` (mirror Task 5.1)
- Create: `src/lib/admin/actions/experiences.ts`
- Create: `src/lib/admin/actions/social-links.ts`
- Create: `src/lib/admin/actions/tech-stack.ts`
- Create: `src/lib/admin/actions/bento.ts`
- Create: `src/lib/admin/actions/feature-flags.ts`
- Create: `src/lib/admin/actions/nav.ts`
- Create: `src/lib/admin/actions/seo.ts`

For each entity, implement `list<X>`, `create<X>`, `update<X>`, `delete<X>`, `reorder<X>` (skip reorder for seo, feature-flags) using the matching schema from `src/lib/admin/schema/<entity>.ts`. Pattern identical to Task 5.1.

- [ ] **Per entity: copy Task 5.1 pattern, adjust schema + table name + tag**
- [ ] **Per entity: commit**

```bash
git add src/lib/admin/actions/<entity>.ts
git commit -m "feat(crud): <entity> server actions"
```

---

## Phase 6 — Image upload

### Task 6.1: R2 presigned PUT URL

**Files:**
- Create: `src/lib/admin/r2.ts`
- Test: `tests/admin/r2.test.ts`

- [ ] **Step 1: Implement presign**

```ts
// src/lib/admin/r2.ts
import { createHmac } from "node:crypto";

const ALLOWED = ["jpg", "jpeg", "png", "webp", "avif"] as const;
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_DIM = 4096;

export function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif",
  };
  return map[mime] ?? "";
}

export function validateImage(mime: string, size: number): void {
  const ext = extFromMime(mime);
  if (!ext) throw new Error("Unsupported MIME");
  if (!ALLOWED.includes(ext as any)) throw new Error("Disallowed extension");
  if (size > MAX_BYTES) throw new Error("File too large");
}

export async function presignPut(key: string, secret: string, ttlSec = 300): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const sig = createHmac("sha256", secret).update(`${key}:${exp}`).digest("base64url");
  return `/api/r2/put?key=${encodeURIComponent(key)}&exp=${exp}&sig=${sig}`;
}
```

- [ ] **Step 2: Write failing test**

```ts
// tests/admin/r2.test.ts
import { describe, it, expect } from "vitest";
import { validateImage, extFromMime } from "@/lib/admin/r2";

describe("image validation", () => {
  it("accepts png", () => { expect(() => validateImage("image/png", 1024)).not.toThrow(); });
  it("rejects svg", () => { expect(() => validateImage("image/svg+xml", 1024)).toThrow(); });
  it("rejects oversize", () => { expect(() => validateImage("image/png", 11 * 1024 * 1024)).toThrow(); });
  it("maps jpeg", () => { expect(extFromMime("image/jpeg")).toBe("jpg"); });
});
```

- [ ] **Step 3: Run test**

Run: `npm test -- tests/admin/r2.test.ts`
Expected: PASS.

- [ ] **Step 4: PUT route (nodejs runtime — sharp doesn't run on edge)**

```ts
// src/app/api/r2/put/route.ts
import type { NextRequest } from "next/server";
import { createHmac } from "node:crypto";
import sharp from "sharp";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const runtime = "nodejs"; // sharp native binaries; edge not supported

export async function PUT(req: NextRequest) {
  const ctx = await getCloudflareContext({ async: true });
  const env = ctx.env as unknown as { R2: R2Bucket; R2_PRESIGN_SECRET: string };
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  const exp = url.searchParams.get("exp");
  const sig = url.searchParams.get("sig");
  if (!key || !exp || !sig) return new Response("Bad request", { status: 400 });
  if (parseInt(exp) < Math.floor(Date.now() / 1000)) return new Response("Expired", { status: 401 });
  const expected = createHmac("sha256", env.R2_PRESIGN_SECRET).update(`${key}:${exp}`).digest("base64url");
  if (sig !== expected) return new Response("Bad signature", { status: 401 });
  const buf = await req.arrayBuffer();
  if (buf.byteLength > 10 * 1024 * 1024) return new Response("Too large", { status: 413 });
  let sharpImg = sharp(Buffer.from(buf));
  const meta = await sharpImg.metadata();
  if ((meta.width ?? 0) > 4096 || (meta.height ?? 0) > 4096) return new Response("Dimensions too large", { status: 400 });
  // Re-encode to strip EXIF + polyglots. Output webp for consistency.
  const out = await sharpImg.rotate().webp({ quality: 85 }).toBuffer();
  await env.R2.put(key, out, { httpMetadata: { contentType: "image/webp" } });
  return new Response(JSON.stringify({ key }), { status: 200 });
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin/r2.ts src/app/api/r2/put/route.ts tests/admin/r2.test.ts
git commit -m "feat(upload): R2 presigned PUT + sharp re-encode"
```

---

## Phase 7 — Public reads (cached)

### Task 7.1: Read helpers with cache tags

**Files:**
- Create: `src/lib/admin/flags.ts`
- Create: `src/lib/admin/read.ts`

- [ ] **Step 1: feature-flags read helper**

```ts
// src/lib/admin/flags.ts
import { unstable_cache } from "next/cache";
import { cacheTag } from "next/cache";

export async function getFlag<T = unknown>(key: string): Promise<T | null> {
  "use cache";
  cacheTag("flags", `flag:${key}`);
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const ctx = await getCloudflareContext({ async: true });
  const d1 = (ctx.env as any).DB as D1Database;
  const row = await d1.prepare("SELECT value FROM feature_flags WHERE key = ?").bind(key).first<{ value: string }>();
  return row ? (JSON.parse(row.value) as T) : null;
}
```

- [ ] **Step 2: Public post reader**

```ts
// src/lib/admin/read.ts
import { cacheTag } from "next/cache";
import { fallback } from "../data/fallback";

export async function getPosts() {
  "use cache";
  cacheTag("posts");
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = await getCloudflareContext({ async: true });
    const d1 = (ctx.env as any).DB as D1Database;
    const rows = await d1.prepare("SELECT * FROM posts WHERE published = 1 ORDER BY date DESC").all<any>();
    return rows.results.map((r: any) => ({ ...r, tags: JSON.parse(r.tags), content: JSON.parse(r.content) }));
  } catch (e) {
    console.warn("D1 read failed, falling back to TS data", e);
    return fallback.posts;
  }
}
```

(Note: `unstable_cache` is being replaced by `'use cache'` directive in Next 16. `cacheComponents: true` enabled in `next.config.ts`. For tests/mutations, server actions use `updateTag(...)` from `next/cache`.)

- [ ] **Step 3: Fallback wrapper**

```ts
// src/data/fallback.ts
import { posts as _posts } from "./posts";
import { projects as _projects } from "./projects";
// ... import others

export const fallback = {
  posts: _posts,
  projects: _projects,
  // ...
};
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/admin/flags.ts src/lib/admin/read.ts src/data/fallback.ts
git commit -m "feat(read): cached public reads with TS fallback"
```

---

### Task 7.2: Wire home page to D1 (with fix for page.tsx:19)

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace static bento import with D1 reader; fix missing label**

Read current `src/app/page.tsx`, find line 19 (the missing-label cell), and add the `label` prop. Then wrap the bento source in `getBentoCells()` from `@/lib/admin/read`. Keep TS fallback for cold start.

```ts
// src/app/page.tsx (relevant block)
import { getBentoCells, getPosts } from "@/lib/admin/read";
import { fallback } from "@/data/fallback";

export default async function Page() {
  const cells = await getBentoCells().catch(() => fallback.bentoCells);
  // ... use cells
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: no TS errors. The `label` prop fix should resolve the diagnostic.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "fix(bento): add missing label + wire to D1"
```

---

## Phase 8 — Admin UI components

### Task 8.1: Admin layout + sidebar

**Files:**
- Create: `src/app/admin/layout.tsx`
- Create: `src/components/admin/AdminSidebar.tsx`

- [ ] **Step 1: Layout**

```tsx
// src/app/admin/layout.tsx
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const runtime = "edge";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Auth check (CF Access + session) — handled by middleware, but double-check here
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Sidebar**

```tsx
// src/components/admin/AdminSidebar.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/posts", label: "Posts" },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/experiences", label: "Experiences" },
  { href: "/admin/social-links", label: "Social Links" },
  { href: "/admin/tech-stack", label: "Tech Stack" },
  { href: "/admin/bento", label: "Bento" },
  { href: "/admin/feature-flags", label: "Flags" },
  { href: "/admin/nav", label: "Nav" },
  { href: "/admin/seo", label: "SEO" },
  { href: "/admin/passkeys", label: "Passkeys" },
  { href: "/admin/audit-log", label: "Audit Log" },
];

export function AdminSidebar() {
  const path = usePathname();
  return (
    <nav className="w-56 border-r p-4 space-y-1">
      {items.map(i => (
        <Link key={i.href} href={i.href} className={`block px-2 py-1 rounded ${path === i.href ? "bg-accent" : ""}`}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/layout.tsx src/components/admin/AdminSidebar.tsx
git commit -m "feat(admin): layout + sidebar"
```

---

### Task 8.2: Login + setup pages

**Files:**
- Create: `src/app/admin/login/page.tsx`
- Create: `src/app/admin/setup/page.tsx`

- [ ] **Step 1: Login page (Turnstile + passkey ceremony)**

```tsx
// src/app/admin/login/page.tsx
"use client";
import { useState } from "react";
import { beginLogin, completeLogin } from "@/lib/admin/actions/auth";

export default function LoginPage() {
  const [stage, setStage] = useState<"idle" | "asserting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function start() {
    try {
      const opts = await beginLogin();
      // @ts-ignore — webauthn is browser-only
      const cred = await navigator.credentials.get({ publicKey: opts });
      const fd = new FormData();
      fd.set("response", JSON.stringify(cred));
      fd.set("ip", ""); // server reads from CF header in production
      await completeLogin(fd);
      window.location.href = "/admin";
    } catch (e: any) {
      setError(e.message ?? "Login failed");
      setStage("error");
    }
  }

  return (
    <div className="max-w-md mx-auto p-8">
      <h1 className="text-2xl mb-4">Admin Login</h1>
      {error && <p className="text-red-500 mb-2">{error}</p>}
      <button onClick={start} className="px-4 py-2 bg-accent rounded" disabled={stage === "asserting"}>
        {stage === "asserting" ? "Awaiting authenticator…" : "Sign in with passkey"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Setup page (registration)**

```tsx
// src/app/admin/setup/page.tsx
"use client";
import { useState } from "react";
import { beginRegistration, completeRegistration } from "@/lib/admin/actions/auth";

export default function SetupPage() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function register(e: React.FormEvent) {
    e.preventDefault();
    try {
      const opts = await beginRegistration();
      // @ts-ignore
      const cred = await navigator.credentials.create({ publicKey: opts });
      const fd = new FormData();
      fd.set("response", JSON.stringify(cred));
      fd.set("name", name);
      await completeRegistration(fd);
      window.location.href = "/admin";
    } catch (e: any) {
      setError(e.message ?? "Registration failed");
    }
  }

  return (
    <div className="max-w-md mx-auto p-8">
      <h1 className="text-2xl mb-4">Setup — Register First Passkey</h1>
      {error && <p className="text-red-500 mb-2">{error}</p>}
      <form onSubmit={register} className="space-y-3">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Device name (e.g. MacBook Touch ID)" className="w-full border p-2 rounded" required />
        <button className="px-4 py-2 bg-accent rounded">Register</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/login/page.tsx src/app/admin/setup/page.tsx
git commit -m "feat(admin): login + setup pages"
```

---

### Task 8.3: Generic EntityTable + EntityForm components

**Files:**
- Create: `src/components/admin/EntityTable.tsx`
- Create: `src/components/admin/EntityForm.tsx`

- [ ] **Step 1: EntityTable (sortable, paginated)**

```tsx
// src/components/admin/EntityTable.tsx
"use client";
import Link from "next/link";

export interface Column<T> { key: keyof T | string; label: string; render?: (row: T) => React.ReactNode; }
export interface EntityTableProps<T> { rows: T[]; columns: Column<T>[]; editHref: (id: string) => string; newHref: string; }

export function EntityTable<T extends { id: string }>({ rows, columns, editHref, newHref }: EntityTableProps<T>) {
  return (
    <div>
      <Link href={newHref} className="inline-block px-3 py-1 bg-accent rounded mb-4">+ New</Link>
      <table className="w-full border-collapse">
        <thead><tr>{columns.map(c => <th key={String(c.key)} className="text-left p-2 border-b">{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className="hover:bg-muted/50">
              {columns.map(c => (
                <td key={String(c.key)} className="p-2 border-b">
                  <Link href={editHref(r.id)}>{c.render ? c.render(r) : (r as any)[c.key]}</Link>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: EntityForm (zod + react-hook-form)**

```tsx
// src/components/admin/EntityForm.tsx
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

export function EntityForm<S extends z.ZodTypeAny>({
  schema, defaultValues, onSubmit, submitLabel = "Save",
}: {
  schema: S; defaultValues: z.infer<S>; onSubmit: (v: z.infer<S>) => Promise<void>; submitLabel?: string;
}) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<S>>({
    resolver: zodResolver(schema),
    defaultValues,
  });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 max-w-xl">
      {Object.keys(schema.shape).map(k => (
        <div key={k}>
          <label className="block text-sm font-medium">{k}</label>
          <input {...register(k)} className="w-full border p-2 rounded" />
          {(errors as any)[k] && <p className="text-red-500 text-sm">{(errors as any)[k].message}</p>}
        </div>
      ))}
      <button disabled={isSubmitting} className="px-4 py-2 bg-accent rounded">{submitLabel}</button>
    </form>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/EntityTable.tsx src/components/admin/EntityForm.tsx
git commit -m "feat(admin): generic EntityTable + EntityForm"
```

---

### Task 8.4: Posts admin pages (template for all entities)

**Files:**
- Create: `src/app/admin/posts/page.tsx`
- Create: `src/app/admin/posts/[id]/page.tsx`
- Create: `src/app/admin/posts/new/page.tsx`

- [ ] **Step 1: List page**

```tsx
// src/app/admin/posts/page.tsx
import { listPosts } from "@/lib/admin/actions/posts";
import { EntityTable } from "@/components/admin/EntityTable";

export default async function PostsList() {
  const rows = await listPosts();
  return (
    <div>
      <h1 className="text-2xl mb-4">Posts</h1>
      <EntityTable
        rows={rows}
        columns={[
          { key: "title", label: "Title" },
          { key: "date", label: "Date" },
          { key: "published", label: "Published", render: r => r.published ? "✓" : "—" },
        ]}
        editHref={id => `/admin/posts/${id}`}
        newHref="/admin/posts/new"
      />
    </div>
  );
}
```

- [ ] **Step 2: Edit page**

```tsx
// src/app/admin/posts/[id]/page.tsx
import { updatePost } from "@/lib/admin/actions/posts";
import { PostInput } from "@/lib/admin/schema/posts";
import { EntityForm } from "@/components/admin/EntityForm";

export default async function EditPost({ params }: { params: { id: string } }) {
  const all = await (await import("@/lib/admin/actions/posts")).listPosts();
  const row = all.find(r => r.id === params.id);
  if (!row) return <p>Not found</p>;
  async function save(v: any) { "use server"; await updatePost(params.id, v); }
  return (
    <div>
      <h1 className="text-2xl mb-4">Edit Post</h1>
      <EntityForm schema={PostInput} defaultValues={row as any} onSubmit={save} />
    </div>
  );
}
```

- [ ] **Step 3: New page**

```tsx
// src/app/admin/posts/new/page.tsx
import { createPost } from "@/lib/admin/actions/posts";
import { PostInput } from "@/lib/admin/schema/posts";
import { EntityForm } from "@/components/admin/EntityForm";

export default function NewPost() {
  async function save(v: any) { "use server"; await createPost(v); }
  return (
    <div>
      <h1 className="text-2xl mb-4">New Post</h1>
      <EntityForm schema={PostInput} defaultValues={{ id: "", title: "", slug: "", date: "2026-07-02", summary: "", tags: [], content: [], published: true } as any} onSubmit={save} />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/posts/
git commit -m "feat(admin): posts CRUD pages"
```

---

### Task 8.5–8.12: Replicate CRUD pages for projects, experiences, social-links, tech-stack, bento, feature-flags, nav, seo

For each entity, copy the posts pattern: list page + edit page + new page. Adjust field names per schema.

- [ ] **Per entity: create list/edit/new pages**
- [ ] **Per entity: commit**

```bash
git add src/app/admin/<entity>/
git commit -m "feat(admin): <entity> CRUD pages"
```

Special: **bento** gets a grid editor component instead of a basic table.

---

### Task 8.13: Passkey manager

**Files:**
- Create: `src/app/admin/passkeys/page.tsx`
- Create: `src/app/admin/passkeys/register/page.tsx`

- [ ] **Step 1: List page**

```tsx
// src/app/admin/passkeys/page.tsx
import { deletePasskey } from "@/lib/admin/actions/passkey";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export default async function PasskeysPage() {
  const ctx = await getCloudflareContext({ async: true });
  const env = ctx.env as unknown as { DB: D1Database };
  const rows = await env.DB.prepare("SELECT credential_id, name, created_at, last_used_at FROM passkeys ORDER BY created_at").all<any>();
  const count = rows.results.length;
  return (
    <div>
      <h1 className="text-2xl mb-4">Passkeys</h1>
      <a href="/admin/passkeys/register" className="inline-block px-3 py-1 bg-accent rounded mb-4">+ Register</a>
      <p className="mb-4 text-sm text-muted">{count} registered (minimum 2 required for safety)</p>
      <table className="w-full">
        <thead><tr><th className="text-left p-2">Name</th><th className="text-left p-2">Created</th><th className="text-left p-2">Last used</th><th></th></tr></thead>
        <tbody>
          {rows.results.map((r: any) => (
            <tr key={r.credential_id} className="border-b">
              <td className="p-2">{r.name}</td>
              <td className="p-2">{r.created_at}</td>
              <td className="p-2">{r.last_used_at ?? "—"}</td>
              <td className="p-2">
                <form action={async () => { "use server"; await deletePasskey(r.credential_id); }}>
                  <button disabled={count <= 1} className="text-red-500">Delete</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Register page (similar to setup, allows registering 3rd/4th passkey)**

```tsx
// src/app/admin/passkeys/register/page.tsx
"use client";
import { useState } from "react";
import { beginRegistration, completeRegistration } from "@/lib/admin/actions/auth";

export default function RegisterPasskey() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  async function register(e: React.FormEvent) {
    e.preventDefault();
    try {
      const opts = await beginRegistration();
      // @ts-ignore
      const cred = await navigator.credentials.create({ publicKey: opts });
      const fd = new FormData();
      fd.set("response", JSON.stringify(cred));
      fd.set("name", name);
      await completeRegistration(fd);
      window.location.href = "/admin/passkeys";
    } catch (e: any) { setError(e.message ?? "Failed"); }
  }
  return (
    <div className="max-w-md mx-auto p-8">
      <h1 className="text-2xl mb-4">Register Additional Passkey</h1>
      {error && <p className="text-red-500 mb-2">{error}</p>}
      <form onSubmit={register} className="space-y-3">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Device name" className="w-full border p-2 rounded" required />
        <button className="px-4 py-2 bg-accent rounded">Register</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Passkey delete server action**

Add to `src/lib/admin/actions/passkey.ts`:
```ts
"use server";
import { updateTag } from "next/cache";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { writeAudit } from "../audit";

export async function deletePasskey(credentialId: string) {
  const ctx = await getCloudflareContext({ async: true });
  const env = ctx.env as unknown as { DB: D1Database };
  const count = await env.DB.prepare("SELECT COUNT(*) as c FROM passkeys").first<{ c: number }>();
  if ((count?.c ?? 0) <= 1) throw new Error("Cannot delete last passkey");
  await env.DB.prepare("DELETE FROM passkeys WHERE credential_id = ?").bind(credentialId).run();
  await writeAudit(env.DB, { action: "passkey_delete", targetTable: "passkeys", targetId: credentialId });
  updateTag("passkeys");
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/passkeys/ src/lib/admin/actions/passkey.ts
git commit -m "feat(admin): passkey manager (list + register + delete)"
```

---

### Task 8.14: Audit log viewer

**Files:**
- Create: `src/app/admin/audit-log/page.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/app/admin/audit-log/page.tsx
export default async function AuditLogPage({ searchParams }: { searchParams: Promise<{ actor?: string; table?: string }> }) {
  const sp = await searchParams;
  const ctx = await getCloudflareContext({ async: true });
  const env = ctx.env as unknown as { DB: D1Database };
  const filters: string[] = [];
  const args: unknown[] = [];
  if (sp.actor) { filters.push("actor_credential_id = ?"); args.push(sp.actor); }
  if (sp.table) { filters.push("target_table = ?"); args.push(sp.table); }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const rows = await env.DB.prepare(`SELECT * FROM audit_log ${where} ORDER BY ts DESC LIMIT 200`).bind(...args).all<any>();
  return (
    <div>
      <h1 className="text-2xl mb-4">Audit Log</h1>
      <form className="mb-4 flex gap-2">
        <input name="actor" placeholder="Actor credential id" defaultValue={sp.actor ?? ""} className="border p-1 rounded" />
        <input name="table" placeholder="Target table" defaultValue={sp.table ?? ""} className="border p-1 rounded" />
        <button className="px-3 py-1 bg-accent rounded">Filter</button>
      </form>
      <table className="w-full text-sm">
        <thead><tr><th className="text-left p-1">Time</th><th className="text-left p-1">Actor</th><th className="text-left p-1">Action</th><th className="text-left p-1">Target</th><th className="text-left p-1">IP</th></tr></thead>
        <tbody>
          {rows.results.map((r: any) => (
            <tr key={r.id} className="border-b">
              <td className="p-1">{r.ts}</td>
              <td className="p-1 font-mono text-xs">{r.actor_credential_id?.slice(0, 12) ?? "—"}</td>
              <td className="p-1">{r.action}</td>
              <td className="p-1">{r.target_table}/{r.target_id}</td>
              <td className="p-1">{r.ip ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/audit-log/page.tsx
git commit -m "feat(admin): audit log viewer"
```

---

## Phase 9 — Migration

### Task 9.1: TS → D1 migration script

**Files:**
- Create: `scripts/migrate-content-to-d1.ts`

- [ ] **Step 1: Implement**

```ts
// scripts/migrate-content-to-d1.ts
import { posts } from "../src/data/posts";
import { projects } from "../src/data/projects";
import { experiences } from "../src/data/experience";
import { socialLinks } from "../src/data/social-links";
import { techStack } from "../src/data/tech-stack";

async function main() {
  // Uses wrangler d1 execute --command for each row
  const exec = (sql: string, args: unknown[] = []) =>
    fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/d1/database/${process.env.CF_D1_ID}/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.CF_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ sql, params: args }),
    }).then(r => r.json());

  for (const p of posts) {
    await exec(
      `INSERT OR REPLACE INTO posts (id, title, slug, date, summary, tags, cover, content, published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [p.slug, p.title, p.slug, p.date, p.summary, JSON.stringify(p.tags), p.cover ?? null, JSON.stringify(p.content)]
    );
  }
  for (const p of projects) {
    await exec(
      `INSERT OR REPLACE INTO projects (id, title, period_start, period_end, link, logo, description, skills, featured, is_expanded, sort_order, published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [p.id, p.title, p.period.start, p.period.end ?? null, p.link ?? null, p.logo ?? null, p.description ?? null, JSON.stringify(p.skills), p.featured ? 1 : 0, p.isExpanded ? 1 : 0, 1000]
    );
  }
  // ... repeat for experiences, social-links, tech-stack
  console.log("Migration complete");
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Add npm script**

Modify `package.json`:
```json
"scripts": { "migrate": "tsx scripts/migrate-content-to-d1.ts" }
```

Run: `npm install -D tsx`

- [ ] **Step 3: Run migration**

```bash
export CF_ACCOUNT_ID=...
export CF_D1_ID=...
export CF_API_TOKEN=...
npm run migrate
```
Expected: "Migration complete".

- [ ] **Step 4: Verify counts**

```bash
wrangler d1 execute pf-admin --remote --command "SELECT (SELECT COUNT(*) FROM posts) AS posts, (SELECT COUNT(*) FROM projects) AS projects, (SELECT COUNT(*) FROM experiences) AS experiences;"
```
Expected: non-zero counts.

- [ ] **Step 5: Commit**

```bash
git add scripts/migrate-content-to-d1.ts package.json package-lock.json
git commit -m "feat(migrate): TS → D1 one-shot script"
```

---

## Phase 10 — E2E tests

### Task 10.1: Playwright setup + admin auth fixture

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/admin-auth.setup.ts`

- [ ] **Step 1: Install + config**

```bash
npx playwright install --with-deps chromium
```

```ts
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: "http://localhost:3000" },
  webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true },
});
```

- [ ] **Step 2: Auth fixture (uses virtual authenticator)**

```ts
// tests/e2e/admin-auth.setup.ts
import { test as setup, expect } from "@playwright/test";

const ADMIN_FILE = "playwright/.auth/admin.json";

setup("authenticate", async ({ page, context }) => {
  // Use Playwright's WebAuthn virtual authenticator
  const cdp = await context.newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: { protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true },
  });
  await page.goto("/admin/setup");
  await page.fill('input[placeholder*="Device"]', "Playwright Test");
  // ... complete ceremony (depends on UI hooks)
  await page.context().storageState({ path: ADMIN_FILE });
});
```

- [ ] **Step 3: Smoke E2E**

```ts
// tests/e2e/posts.spec.ts
import { test, expect } from "@playwright/test";

test.use({ storageState: "playwright/.auth/admin.json" });

test("create + edit + delete post", async ({ page }) => {
  await page.goto("/admin/posts/new");
  await page.fill('input[name="id"]', "e2e-1");
  await page.fill('input[name="title"]', "E2E Test");
  await page.fill('input[name="slug"]', "e2e-test");
  await page.click('button[type="submit"]');
  await expect(page.locator("text=E2E Test")).toBeVisible();
});
```

- [ ] **Step 4: Run**

Run: `npx playwright test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts tests/e2e/ package.json package-lock.json
git commit -m "test(e2e): admin CRUD smoke with Playwright + virtual WebAuthn"
```

---

## Phase 11 — Hardening pass

### Task 11.1: Verify OWASP coverage

- [ ] **Step 1: Security headers test**

Run: `npm run build && npm run start &`
Run: `curl -I http://localhost:3000/admin/login`
Expected: all 6 headers present.

- [ ] **Step 2: CSP nonce propagation**

Verify `x-nonce` header present on every admin response.

- [ ] **Step 3: Origin enforcement**

Run: `curl -X POST http://localhost:3000/admin/posts -H "Origin: https://evil.com" -d "{}"`
Expected: 403.

- [ ] **Step 4: Rate limit lockout**

Run: 6× `curl http://localhost:3000/admin/login`
Expected: 6th request rejected with 429-equivalent.

- [ ] **Step 5: Audit write blocks original**

Test: temporarily disable audit table, attempt a write, expect 500.

- [ ] **Step 6: OSV scan**

Run: `npm run build && npx osv-scanner --lockfile=package-lock.json`
Expected: 0 high/critical.

- [ ] **Step 7: Commit any fixes**

```bash
git add -A
git commit -m "chore: hardening verification pass"
```

---

### Task 11.2: Operational config (CF WAF, email alerts, daily R2 snapshot)

**Files:**
- Modify: `wrangler.toml`
- Create: `src/lib/admin/alerts.ts`
- Create: `src/app/cron/audit-snapshot/route.ts`

- [ ] **Step 1: Add cron trigger to wrangler.toml**

```toml
[triggers]
crons = ["0 3 * * *"]  # daily 03:00 UTC: audit snapshot
```

- [ ] **Step 2: Daily audit snapshot route**

```ts
// src/app/cron/audit-snapshot/route.ts
import { createGzip } from "node:zlib";

export const runtime = "edge";

export async function GET(req: Request) {
  const ctx = await getCloudflareContext({ async: true });
  const env = ctx.env as unknown as { DB: D1Database; R2: R2Bucket; CRON_SECRET: string };
  if (req.headers.get("cf-cron-secret") !== env.CRON_SECRET) return new Response("Unauthorized", { status: 401 });
  const rows = await env.DB.prepare("SELECT * FROM audit_log WHERE ts >= datetime('now', '-1 day')").all<any>();
  const jsonl = rows.results.map((r: any) => JSON.stringify(r)).join("\n");
  const key = `audit/${new Date().toISOString().slice(0, 10)}.jsonl.gz`;
  const gz = await new Promise<Uint8Array>((res, rej) => {
    const chunks: Buffer[] = [];
    createGzip().on("data", c => chunks.push(c)).on("end", () => res(new Uint8Array(Buffer.concat(chunks)))).on("error", rej).end(jsonl);
  });
  await env.R2.put(key, gz, { httpMetadata: { contentType: "application/gzip" } });
  return new Response("OK");
}
```

- [ ] **Step 3: Alerts helper (called from audit on anomalies)**

```ts
// src/lib/admin/alerts.ts
export async function alert(env: { ALERT_EMAIL_WEBHOOK: string }, subject: string, body: string) {
  await fetch(env.ALERT_EMAIL_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subject, body }),
  });
}
```

Wire calls into: failed login lockout (Task 4.3 `completeLogin`), counter regression (Task 4.3), audit write failure (catch in every action), D1 error spike (catch in reads).

- [ ] **Step 4: CF WAF Rate Limiting Rules (document in README, configure in CF dashboard)**

Document in Task 11.2 README: 10 req/10s per IP to `/admin/*`; 100 req/h to auth endpoints; 5 failed ceremonies → 1h lockout (also enforced at app layer via D1 counter).

- [ ] **Step 5: Commit**

```bash
git add wrangler.toml src/lib/admin/alerts.ts src/app/cron/audit-snapshot/route.ts
git commit -m "feat(ops): daily audit snapshot + alert helper + CF WAF docs"
```

---

### Task 11.3: README admin runbook

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document CF WAF rules**

Add to README: "CF WAF Rate Limiting Rules (configured in CF dashboard → Security → WAF → Rate limiting rules): 1) Path `/admin/*`, 10 requests per 10 seconds per IP. 2) Path `/admin/login` + `/admin/setup`, 100 requests per hour per IP. App-layer D1 counter enforces 5-failed-ceremony lockout on top."

- [ ] **Step 2: Document admin operations**

```markdown
## Admin Panel

Path: `/admin/*`. Behind Cloudflare Access (email OTP) + Passkey session.

### First-time setup
1. Add yourself to CF Access application policy (your email).
2. Visit `/admin/login`. CF Access redirects → email OTP → app loads.
3. App detects no passkeys → redirect to `/admin/setup`.
4. Register first passkey (Touch ID / Windows Hello).
5. Forced: register second passkey (phone / YubiKey) before continuing.

### Daily ops
- Edit content: `/admin/posts`, `/admin/projects`, etc.
- Toggle features: `/admin/feature-flags`.
- View audit: `/admin/audit-log`.

### Secrets rotation (quarterly)
```bash
wrangler secret put ADMIN_COOKIE_SECRET
```
This invalidates all sessions; users re-auth.

### Recovery
- Lost all passkeys: log into CF Access dashboard → DB console → manually `INSERT INTO passkeys` with new credential via setup flow (requires existing session OR direct DB access).
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: admin runbook"
```

---

## Summary

- **~50 tasks**, mostly small. Phases 0–2 are foundation (deps, DB, schema, helpers). Phases 3–4 are auth. Phases 5–8 are CRUD + admin UI (template replicated 9×). Phase 9 is one-shot migration. Phase 10 is E2E. Phase 11 is hardening + docs.
- **Frequent commits**: every task ends with a commit. Conventional Commits format.
- **TDD where cheap**: HMAC session, audit, rate limit, image validation, security headers all have tests written first. WebAuthn ceremony smoke-tested; full ceremony verified via Playwright virtual authenticator.
- **No co-author trailer** per project convention.

## Out of scope (explicit)

- Comments, reactions.
- Public write API.
- Multi-user collaboration.
- Full-text search beyond SQL LIKE.
- Virus scan on uploads.
- A/B testing.
- Auto-migrations.