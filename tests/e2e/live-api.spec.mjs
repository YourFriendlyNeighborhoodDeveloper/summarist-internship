import { expect, test } from "@playwright/test";

test.describe("Live Summarist API @live", () => {
  test("loads real books and searches the real API", async ({ page }) => {
    await page.goto("/for-you");
    await expect(page.getByRole("list", { name: "Recommended For You" }).getByRole("listitem").first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("list", { name: "Suggested Books" }).getByRole("listitem").first()).toBeVisible({
      timeout: 30_000,
    });

    await page.getByPlaceholder("Search for books").fill("eric");
    await expect(
      page.getByRole("region", { name: "Search results" }).getByRole("link", { name: /The Lean Startup/ }),
    ).toBeVisible({ timeout: 30_000 });
  });

  test("opens a real book page", async ({ page }) => {
    await page.goto("/book/f9gy1gpai8");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("The Lean Startup", { timeout: 30_000 });
  });
});
