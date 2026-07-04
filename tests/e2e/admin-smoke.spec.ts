import { test, expect } from "@playwright/test";

// E2E happy-path: admin login page renders + can begin passkey ceremony.
// Full WebAuthn ceremony (incl. virtual authenticator) is exercised when run
// against a real Cloudflare deployment with CF Access configured.
test("admin login page renders", async ({ page }) => {
  await page.goto("/admin/login");
  await expect(page.getByRole("heading", { name: "Admin Login" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Sign in with passkey/i })).toBeVisible();
});

test("admin setup page renders", async ({ page }) => {
  await page.goto("/admin/setup");
  await expect(page.getByRole("heading", { name: /Setup/i })).toBeVisible();
  await expect(page.getByPlaceholder(/Device name/)).toBeVisible();
});
