import { defineConfig, defineProject } from "vitest/config";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { resolve } from "node:path";

const migrations = await readD1Migrations(resolve("./migrations"));

// Cloudflare Workers project: runs admin tests inside the workerd runtime
// with a real D1 binding. Migrations are injected as a serialisable binding.
const workersProject = defineProject({
  resolve: {
    alias: {
      "@/lib/admin": resolve("./src/lib/admin"),
      "@": resolve("./src"),
      "next/cache": resolve("./tests/admin/next-cache-stub.ts"),
    },
  },
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.test.toml" },
      miniflare: {
        compatibilityDate: "2026-07-01",
        compatibilityFlags: ["nodejs_compat_v2"],
        bindings: { TEST_MIGRATIONS: migrations },
      },
    }),
  ],
  test: {
    name: "workers",
    include: ["tests/admin/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: [resolve("./tests/admin/apply-migrations.ts")],
  },
});

// jsdom project: runs DOM/unit tests with the previous config (globals + jsdom).
const unitProject = defineProject({
  resolve: {
    alias: {
      "\\.(css|module\\.css)$": resolve("./vitest.css.stub"),
    },
  },
  test: {
    name: "unit",
    environment: "jsdom",
    setupFiles: [resolve("./vitest.setup.ts")],
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});

export default defineConfig({
  test: {
    projects: [unitProject, workersProject],
  },
});
