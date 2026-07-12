import { expect, test } from "@playwright/test";
import { posts } from "../../src/data/posts";

test("published blog index and detail routes agree", async ({ page }) => {
  await page.goto("/blog");
  await expect(page.getByRole("heading", { name: "Blog" })).toBeVisible();
  for (const post of posts) {
    await expect(page.getByRole("link", { name: post.title })).toBeVisible();
    const response = await page.goto(`/blog/${post.slug}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: post.title })).toBeVisible();
    await page.goto("/blog");
  }
});
