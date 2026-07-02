import type { D1Migration } from "@cloudflare/vitest-pool-workers";

export async function setup({ env }: { env: { DB: D1Database; TEST_MIGRATIONS: D1Migration[] } }) {
  // eslint-disable-next-line no-console
  console.log("[apply-migrations] applying", env.TEST_MIGRATIONS.length, "migrations");
  for (const migration of env.TEST_MIGRATIONS) {
    for (const query of migration.queries) {
      try {
        await env.DB.exec(query);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[apply-migrations] failed on", migration.name, e);
        throw e;
      }
    }
  }
  // eslint-disable-next-line no-console
  console.log("[apply-migrations] done");
}