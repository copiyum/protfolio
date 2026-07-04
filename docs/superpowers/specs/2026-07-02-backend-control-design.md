---
title: Backend Control — Single Admin Panel
date: 2026-07-02
status: draft (pending user review)
---

# Backend Control — Single Admin Panel

Make every visible/configurable surface in the portfolio controllable from one admin panel. Backend = single CF D1 database, hosted on OpenNext-on-Cloudflare, gated by Cloudflare Access + Passkeys + Turnstile.

## Context

Portfolio (`copiyum/portfolio`) is Next.js 16 + Tailwind v4 + Framer Motion + MapLibre. Content lives in `src/data/*.ts` files (posts, projects, experience, social-links, tech-stack, bento). One API route (`/api/now-playing`) exists for Last.fm. `src/data/bento.ts` and `src/app/page.tsx` hold bento layout. Keystatic + CF D1 CMS path was already decided for blog/visitors (memory `cicd-roadmap.md`, 2026-06-27).

User wants: **single admin panel** controlling content + runtime knobs + flags + nav + SEO. "100% safe" — passkeys only, no fallback passwords, defense in depth.

## Locked decisions

| Decision | Choice | Why |
|---|---|---|
| Storage | Cloudflare D1 (SQLite) | Fits existing roadmap; free tier; one store covers content + flags |
| Deploy | OpenNext on Cloudflare | D1 + Access + Passkeys all on CF — no cross-cloud hop |
| Auth | Cloudflare Access + Passkeys (WebAuthn) | Email OTP at edge + phishing-resistant passkey |
| Rate limit | Turnstile + CF WAF Rate Limiting + D1 counter | Native, no third-party fingerprinting |
| Admin UI | Hand-rolled (server actions) | Ponytail: fewest deps; edge-compatible |
| Schema | Normalized D1 tables per entity + zod schemas | One pattern; structured forms; type-safety end-to-end |
| Image storage | Cloudflare R2 | Free egress; presigned PUT URLs |
| Key rotation | HMAC secret + passkey re-registration (L8) | Quarterly rotation; counter-based clone detection |

## Architecture

```
Browser ── /admin/* ──▶ Next.js (OpenNext on CF Workers)
                          │
                          ├─ middleware: CF Access JWT + Passkey session
                          │
                          └─ Server Action ──▶ D1 (SQLite)
                                               │
Browser ── / · /blog · /projects ──▶ Page ─────┘
                                       │
                                       └─ unstable_cache + tag("posts") etc.
```

- Single Next.js app. Routes: `/admin/*` (gated), public pages unchanged.
- One D1 binding. One R2 binding. One Worker.
- Public reads cached with `unstable_cache` keyed by entity + tag. Writes call `revalidateTag(...)` for granular flush.
- Passkey session: signed cookie, httpOnly, `__Host-` prefix, 15 min idle, sliding renewal.

## Data model (D1)

```
posts           (id PK, title, slug UNIQUE, date, summary, tags JSON,
                 cover?, content JSON, published BOOL, created_at, updated_at)
projects       (id PK, title, period_start, period_end?, link?, logo?, description?,
                skills JSON, featured BOOL, is_expanded BOOL, sort_order INT,
                published BOOL, created_at, updated_at)
experiences    (id PK, company, role, employment_type?, period_start, period_end?,
                icon?, description?, skills JSON, sort_order INT, published BOOL,
                created_at, updated_at)
social_links   (id PK, label, href, sort_order INT, published BOOL,
                created_at, updated_at)
tech_stack     (id PK, name, icon?, category, sort_order INT, published BOOL,
                created_at, updated_at)
bento_cells    (id PK, kind ENUM, label, value?, sub?, payload JSON,
                col_span, row_span, sort_order INT, visible BOOL,
                visibility_window JSON?, created_at, updated_at)
feature_flags  (key PK, value JSON, updated_at)
nav_items      (id PK, label, href, sort_order INT, visible BOOL,
                created_at, updated_at)
seo_defaults   (id='singleton', title_template, og_image, description,
                created_at, updated_at)
passkeys       (credential_id PK, public_key BLOB, counter INT, transports JSON,
                name, created_at, last_used_at)
sessions       (id PK, passkey_credential_id FK, expires_at, created_at, ip, ua)
audit_log      (id PK, actor_credential_id, action, target_table, target_id,
                ip, ua, ts, diff JSON)
rate_limits    (scope_key PK, window_start, count)
```

Notes:
- JSON columns stored as TEXT. Zod validates on read.
- No JOINs in read paths (D1 optimized for single-table queries; prepared statements cached).
- `bento_cells.kind` ENUM enforced in app layer (D1 has no native ENUM).
- `seo_defaults` = singleton row.

## Auth layers

| L | Layer | Defense |
|---|---|---|
| **L1** | CF Access on `/admin/*` | Email OTP at edge; bootstrap for first passkey registration; blocks scanners before app |
| **L2** | Passkeys only (no fallback password) | `@simplewebauthn/server` v10+; phishing-resistant; counter increment; regression alert; ≥2 passkeys required |
| **L3** | Short sessions + re-prompt | 15 min idle, sliding; `__Host-pf_admin` cookie; HMAC-SHA256 signed; constant-time compare; re-prompt for destructive ops |
| **L4** | CSRF + origin | SameSite=lax cookie; Next.js server-action same-origin; explicit `Origin` header allowlist on writes |
| **L5** | Rate limit + lockout | Turnstile on login/register; CF WAF Rate Limiting Rules (IP/path); D1 counter for session-level caps; 5 failed ceremonies/h → 1h lockout |
| **L6** | Audit log | Every write logged; auth attempts logged; immutable from admin UI; daily R2 snapshot; write failure blocks original write |
| **L8** | Key rotation | HMAC secret rotated quarterly via `wrangler secret put`; passkey counter increment + regression alerts |

## Rate limiting stack

- **Turnstile** (free, invisible, CF-native) on `/admin/login` + `/admin/setup`.
- **CF Rate Limiting Rules** (free, 10 rules) in WAF: 10 req / 10 s per IP to `/admin/*`; 100 req / h to auth endpoints.
- **D1 `rate_limits` counter** for per-session write caps (only if WAF rules fall short).

Rejected: fingerprint.js — client-side fingerprinting (tracking, not limiting); bypassable open-source version; GDPR noise; commercial costs $$.

## Admin UI

```
/admin                  dashboard (audit preview, recent writes, passkey health)
/admin/login            CF Access → Turnstile → passkey ceremony
/admin/setup            bootstrap: register first + second passkey
/admin/posts            table | new | [id] edit
/admin/projects         …
/admin/experiences      …
/admin/social-links     …
/admin/tech-stack       …
/admin/bento            grid editor (cells, sizes, order, visibility)
/admin/feature-flags    key/value editor
/admin/nav              links
/admin/seo              singleton form
/admin/passkeys         list | register | delete  (≥2 required)
/admin/audit-log        read-only, filterable
```

```
src/app/admin/...                     routes (RSC + client islands)
src/lib/admin/
  schema/<entity>.ts                  zod schemas (shared client+server)
  actions/<entity>.ts                 server actions (create/update/delete/reorder)
  db.ts                               D1 client, prepared-statement cache
  session.ts                          passkey cookie sign/verify (HMAC, constant-time)
  passkey.ts                          WebAuthn ceremony (register + assert)
  ratelimit.ts                        D1 counter helpers
  r2.ts                               presigned PUT URL helpers
  audit.ts                            write audit row
  flags.ts                            feature-flag read (cached)
  middleware.ts                       CSP + HSTS + frame + content-type + permissions
```

Form mechanics:
- `react-hook-form` + `zod` via `@hookform/resolvers`. Single zod schema per entity = validation + types + defaults.
- Field type derived from schema (zod type → input/textarea/JSON editor/R2 uploader).
- Drag-drop reorder: optimistic UI + `reorderX` action; recompute stride=1000 in single transaction.
- Image upload: Worker → presigned PUT URL → browser PUTs to R2 → key returned → DB stored. **No bytes through Next.**
- List table: server-paginated (50/page), bulk delete with confirmation + re-prompt.

## Read/write flow

**Public reads:**
- Every entity read = single D1 query wrapped in `unstable_cache(fn, key, { tags: ['posts', 'post:slug-x'] })`.
- First miss hits D1; subsequent served from edge cache.
- Writes call `revalidateTag(entity)` — granular flush.
- ISR for `/blog/[slug]` via `generateStaticParams` reading D1 at build time.

**Admin writes (server action):**
1. `requireAdmin()` middleware (CF Access JWT + passkey session).
2. Rate-limit check (D1 counter).
3. Zod parse input.
4. D1 write.
5. `audit_log` insert. **Failure here blocks the write.**
6. `revalidateTag(entity)`.
7. Return success / field errors.

**Reorder:**
- Drag-drop sends new order list → server action validates against current `sort_order` → writes new stride-1000 values in single transaction.

## Passkey ceremony details

**First login (bootstrap):**
1. User hits `/admin/login`. CF Access middleware validates JWT.
2. App checks `passkeys` table — any registered? If no → redirect `/admin/setup`.
3. `/admin/setup`: Turnstile → registration ceremony → store credential. Force 2nd passkey registration before continuing.

**Subsequent logins:**
1. CF Access → app → `/admin/login` → Turnstile → WebAuthn assertion ceremony.
2. Verify signature with stored public key. Increment counter. Reject if counter went backwards (= possible clone → alert + invalidate).
3. Issue session cookie.

**Sensitive op re-prompt:**
- Delete / schema change / passkey delete / key rotation → middleware forces fresh passkey assertion in last 60 s, else 401 + ceremony.

**Session cookie (`__Host-pf_admin`):**
- `httpOnly`, `secure`, `sameSite=lax`, `path=/admin`.
- Payload: `{credential_id, expires_at, nonce}` → HMAC-SHA256 with `ADMIN_COOKIE_SECRET` (set via `wrangler secret put`).
- Sliding renewal on any admin request.
- Constant-time compare on verify. Reject if `expires_at < now`.

## Migration of existing TS data

One-shot script: `scripts/migrate-content-to-d1.ts`.
- Static-imports each `src/data/*.ts` → maps to D1 schema → `INSERT … ON CONFLICT(id) DO UPDATE`.
- Runs locally against remote D1 via `wrangler d1 execute --remote`.
- ID strategy: slug for posts; existing `id` for projects/experiences; new UUIDs for bento/flags/nav/seo.
- Originals kept as **fallback** in `src/data/*.ts`. `db.ts` wrapper: try D1, fallback to TS, log warning.

## Testing

- Vitest unit tests: zod schemas, sort_order stride math, HMAC sign/verify, rate-limit counter logic.
- Integration: `vitest-environment-miniflare` for D1/R2 in tests.
- One E2E happy path per entity (create → edit → reorder → delete) via Playwright on preview deploy.
- Skip per-field validation tests (zod has its own; trust the lib).
- One test per non-trivial branch. No framework sprawl.

## Error handling

- Public pages: fallback to TS data on D1 read failure; log to console + `audit_log`.
- Admin pages: error boundary per route → user-friendly message + "copy error ID" (sha256 of error+ts[:8]).
- D1 read errors: retry once with exponential backoff. Fail fast on writes.
- R2 upload failures: client retries 3× with backoff; permanent failure → form error.
- Passkey ceremony failures: 5 / h lockout; alert email on 3rd consecutive failure.
- Audit log write failure: **blocks original write** — refuse rather than lose accountability.

## Security: OWASP Top 10 coverage

| # | Risk | Defense |
|---|---|---|
| A01 Broken Access Control | CF Access; `requireAdmin()` per action; passkey session; no public mutations; IDOR-prevented |
| A02 Cryptographic Failures | HTTPS; HMAC-SHA256 session; constant-time compare; `__Host-` prefix; no PII in audit; **CSP nonce**; **HSTS preload**; magic-byte MIME |
| A03 Injection | D1 prepared statements only; zod parse pre-DB; React default escape; **no `dangerouslySetInnerHTML`** (lint rule); LIKE escape `%`/`_`; social `href` allowlist |
| A04 Insecure Design | Threat model (L1–L8); defense in depth; bootstrap via CF Access; counter regression = clone detection |
| A05 Security Misconfiguration | **Security headers middleware** (CSP, HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy); `wrangler secret put` only; `.env*` gitignored; `npm ci` in CI; CORS same-origin + `Origin` allowlist |
| A06 Vulnerable Components | OSV-Scanner in CI; Dependabot weekly; `npm ci`; unused dep audit |
| A07 Auth Failures | Passkey-only; WebAuthn origin binding; WAF rate limit + D1 lockout; 15 min idle; constant-time verify; ≥2 passkeys; counter increment + regression alert; 5-min challenge expiry; auth attempt log |
| A08 Integrity | Audit log immutable; daily R2 snapshot; migrations reviewed pre-deploy; CF Workers signed; R2 ETag check |
| A09 Logging | Audit log; auth attempt log; **alerts via CF Email Worker** on failures; 90d hot → R2 archive; PII redaction |
| A10 SSRF | No `fetch` from user URLs; R2 presigned; `href` protocol allowlist; outbound URL allowlist |

### Extras
- **XSS:** React default + CSP nonce + no `dangerouslySetInnerHTML`.
- **CSRF:** SameSite=lax + server-action same-origin + explicit `Origin` check.
- **Clickjacking:** `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` on admin.
- **File upload abuse:** R2 presigned; max 10 MB; magic-byte MIME; allowlist (jpg/png/webp/avif, **no SVG**); max 4096×4096; **sharp re-encode** strips EXIF.
- **Open redirect:** post-login redirect must match `^/admin(/.*)?$`.
- **Race conditions:** sort_order in single transaction; counter atomic.
- **ReDoS:** no user regex; SQL LIKE for search.
- **Admin enumeration:** CF Access response opaque.
- **Cookie bomb:** cookie bounded; no user-controlled fields.
- **Session fixation:** new HMAC nonce per login.
- **Information disclosure:** user errors sanitized; CF hides version.
- **Debug mode off:** `NODE_ENV=production` explicit in `wrangler.toml`.

## Out of scope

- Comments / reactions on posts.
- Public write API.
- Multi-user collaboration / drafts.
- Search beyond SQL LIKE.
- Virus scan on uploads (documented limitation).
- A/B testing framework.
- Schema migrations (manual SQL files, reviewed pre-deploy).

## Open questions

None at time of writing. Pending user review.

## Open questions (for implementation plan)

- Exact list of one-shot setup commands (CF Access app, Turnstile widget, R2 bucket, D1 binding, secret).
- Migration script invocation order.
- Playwright fixture for admin auth (stub passkey?).
- Pre-existing diagnostic on `src/app/page.tsx:19` — bento cell missing `label` prop. Decide: fix during migration (add label to bento.ts data) or as a separate task. Plan should call this out.

These belong in the implementation plan, not this spec.