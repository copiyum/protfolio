# sarang.dev

Personal site + admin panel.

## Admin Panel (`/admin/*`)

Behind Cloudflare Access (email OTP) + Passkey session. Hand-rolled admin UI on OpenNext + Cloudflare D1.

### First-time setup

1. Add yourself to CF Access application policy (your email) in the Cloudflare dashboard.
2. Configure secrets:
   ```bash
   wrangler secret put ADMIN_COOKIE_SECRET     # 32+ random bytes
   wrangler secret put CF_ACCESS_AUD           # CF Access app AUD tag
   wrangler secret put CF_ACCESS_TEAM_DOMAIN   # e.g. myteam.cloudflareaccess.com
   wrangler secret put TURNSTILE_SECRET
   wrangler secret put R2_PRESIGN_SECRET
   wrangler secret put ALERT_EMAIL_WEBHOOK     # optional
   wrangler secret put CRON_SECRET             # for audit-snapshot cron
   ```
3. Create remote D1 + R2 + apply schema:
   ```bash
   wrangler d1 create pf-admin      # paste database_id into wrangler.toml
   wrangler r2 bucket create pf-admin-assets
   wrangler d1 execute pf-admin --remote --file=migrations/0001_initial.sql
   ```
4. Deploy. Visit `/admin/login`. CF Access lets you through → app detects no passkeys → `/admin/setup` → register first passkey.
5. App forces registration of a 2nd passkey (phone / YubiKey) before continuing.

### Daily ops

- Edit content: `/admin/posts`, `/admin/projects`, `/admin/experiences`, etc.
- Toggle features: `/admin/feature-flags` (set/delete keys; values are JSON).
- SEO defaults: same page (singleton form).
- View audit: `/admin/audit-log` (filterable by actor + table).
- Manage passkeys: `/admin/passkeys` (delete disabled if it would leave <2).

### CF WAF Rate Limiting Rules (configure in CF dashboard)

- Path `/admin/*` → 10 requests / 10s per IP.
- Path `/admin/login` + `/admin/setup` → 100 requests / hour per IP.
- App-layer D1 counter enforces 5 failed passkey ceremonies per hour per IP → 1h lockout + email alert.

### Secrets rotation (quarterly)

```bash
wrangler secret put ADMIN_COOKIE_SECRET
```

This invalidates all active sessions. Users must re-authenticate with passkey.

### Recovery (lost all passkeys)

1. Log into Cloudflare dashboard with your account.
2. Open the D1 database console for `pf-admin`.
3. To re-register: visit `/admin/setup` (CF Access still gates). If CF Access lost, regenerate `ADMIN_COOKIE_SECRET` to force re-login.

### Content migration (TS → D1)

One-shot, idempotent. Run once after applying schema:

```bash
export CF_ACCOUNT_ID=...
export CF_D1_ID=...
export CF_API_TOKEN=...
npm run migrate
```

### Dev

```bash
npm run dev           # next dev
npm test              # vitest
npm run test:e2e      # playwright (requires dev server)
```

### Security model

See `docs/superpowers/specs/2026-07-02-backend-control-design.md` for full spec, and `docs/superpowers/plans/2026-07-02-backend-control.md` for implementation plan.

OWASP Top 10 (2021) coverage: A01 access control (CF Access + passkey + requireAdmin per action), A02 crypto (HTTPS / HMAC-SHA256 / constant-time / `__Host-` prefix / no PII), A03 injection (D1 prepared statements / zod parse / no `dangerouslySetInnerHTML`), A04 insecure design (defense in depth / bootstrap via CF Access / counter regression = clone detection), A05 misconfig (CSP / HSTS / frame deny / nosniff / referrer / permissions / `wrangler secret put` only), A06 vulnerable components (OSV / Dependabot), A07 auth fail (passkey-only / origin check / rate limit / ≥2 passkeys / counter alerts), A08 integrity (audit log immutable / R2 snapshot / signed deploys), A09 logging (audit + alerts / 90d retention), A10 SSRF (no `fetch` from user URLs / protocol allowlist).