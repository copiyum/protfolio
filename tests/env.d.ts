// Cloudflare.Env augmentation for the admin test environment.
//
// The test runner (vitest-pool-workers) exposes a D1 binding (DB) plus a
// test-only binding (TEST_MIGRATIONS) injected via vitest.config.mts.
// Production wrangler types are generated separately via `wrangler types` and
// provide the real bindings.
import type { D1Migration } from "@cloudflare/vitest-pool-workers";

declare global {
  namespace Cloudflare {
    interface Env {
      DB: D1Database;
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}

export {};
