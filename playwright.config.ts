import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      PLAYWRIGHT_TEST: "1",
      ADMIN_COOKIE_SECRET: "playwright-admin-key-7mQ2vN9xK4pR6sT8",
      RATE_LIMIT_SECRET: "playwright-rate-key-9vN4xQ2mL7pR8sT6",
      TURNSTILE_SECRET: "playwright-turnstile-key-5kR8vN2mQ7pT9xS4",
      CF_ACCESS_AUD: "playwright-audience",
      CF_ACCESS_TEAM_DOMAIN: "playwright.cloudflareaccess.com",
    },
  },
});
