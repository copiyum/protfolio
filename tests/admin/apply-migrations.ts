import type { D1Migration } from "@cloudflare/vitest-pool-workers";

export async function setup({ env }: { env: { DB: D1Database; TEST_MIGRATIONS: D1Migration[] } }) {
  console.log("[apply-migrations] applying", env.TEST_MIGRATIONS.length, "migrations");
  for (const migration of env.TEST_MIGRATIONS) {
    for (const query of migration.queries) {
      try {
        await env.DB.exec(query);
      } catch (e) {
        console.error("[apply-migrations] failed on", migration.name, e);
        throw e;
      }
    }
  }
  console.log("[apply-migrations] done");
}
