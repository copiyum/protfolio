import { beforeEach, describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import { applyD1Migrations } from "cloudflare:test";
import { createAuthGuard } from "@/lib/admin/auth-guard";
import { signSession } from "@/lib/admin/session";

const SECRET = "admin-freshness-key-7mQ2vN9xK4pR6sT8";

async function sessionCookie(freshAt: number) {
  const expiresAt = new Date(Date.now() + 60_000).toISOString();
  await env.DB.prepare(
    "INSERT OR REPLACE INTO passkeys (credential_id, public_key, counter, transports, name) VALUES ('fresh-cred', X'00', 0, '[]', 'fresh')",
  ).run();
  await env.DB.prepare(
    "INSERT OR REPLACE INTO sessions (id, passkey_credential_id, expires_at, ip) VALUES ('fresh-session', 'fresh-cred', ?, 'ip:test')",
  ).bind(expiresAt).run();
  return signSession({
    sessionId: "fresh-session",
    credentialId: "fresh-cred",
    expiresAt,
    nonce: "nonce",
    freshAt,
  }, SECRET);
}

describe("fresh admin assertions", () => {
  beforeEach(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
  });

  it("rejects stale sessions and accepts a recent passkey assertion", async () => {
    const guard = createAuthGuard({
      DB: env.DB,
      ADMIN_COOKIE_SECRET: SECRET,
      RATE_LIMIT_SECRET: env.RATE_LIMIT_SECRET,
      CF_ACCESS_AUD: "aud",
      CF_ACCESS_TEAM_DOMAIN: "team.example.com",
    });
    const headers = new Headers({
      origin: "https://sarang.dev",
      host: "sarang.dev",
      "cf-connecting-ip": "1.2.3.4",
    });
    await expect(guard.serverActionGuard({
      headers,
      cookie: await sessionCookie(Date.now() - 120_000),
      write: true,
      fresh: true,
      skipCfAccess: true,
    })).rejects.toThrow("Fresh passkey assertion required");
    await expect(guard.serverActionGuard({
      headers,
      cookie: await sessionCookie(Date.now()),
      write: true,
      fresh: true,
      skipCfAccess: true,
    })).resolves.toMatchObject({ credentialId: "fresh-cred" });
  });
});
