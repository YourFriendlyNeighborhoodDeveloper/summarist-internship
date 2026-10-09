import { expect, test } from "@playwright/test";
import { mockBookApi } from "./support.mjs";

const isSearch = (url) => url.pathname.endsWith("/getBooksByAuthorOrTitle");

test.describe("Search", () => {
  test("waits exactly 300ms after the last keystroke before calling the API", async ({ page }) => {
    const calls = [];
    await mockBookApi(page, { onRequest: (url) => isSearch(url) && calls.push(url.searchParams.get("search")) });
    await page.clock.install();
    await page.goto("/for-you");
    await expect(page.getByRole("list", { name: "Recommended For You" })).toBeVisible();
    await page.clock.pauseAt(Date.now() + 60_000);

    const input = page.getByPlaceholder("Search for books");
    for (const term of ["h", "ho", "how", "how ", "how t", "how to"]) {
      await input.fill(term);
      await page.clock.runFor(100);
    }
    await page.waitForTimeout(150);
    expect(calls).toHaveLength(0);

    await page.clock.runFor(198);
    await page.waitForTimeout(150);
    expect(calls).toHaveLength(0);

    await page.clock.runFor(2);
    await expect.poll(() => calls).toEqual(["how to"]);
  });

  test("shows results for the latest term and ignores stale responses", async ({ page }) => {
    const aborted = [];
    page.on("requestfailed", (request) => {
      if (request.url().includes("getBooksByAuthorOrTitle")) aborted.push(new URL(request.url()).searchParams.get("search"));
    });
    await mockBookApi(page, { searchDelay: (term) => (term === "how" ? 2000 : 0) });
    await page.goto("/for-you");

    const input = page.getByPlaceholder("Search for books");
    await input.fill("how");
    await page.waitForTimeout(600);
    await input.fill("eric");

    const results = page.getByRole("region", { name: "Search results" });
    await expect(results.getByRole("link", { name: /The Lean Startup/ })).toBeVisible();
    await page.waitForTimeout(2200);
    await expect(results.getByRole("link")).toHaveCount(1);
    await expect(results.getByRole("link", { name: /How to Win Friends/ })).toHaveCount(0);
    expect(aborted).toContain("how");
  });

  test("searches by title or author and navigates to a result", async ({ page }) => {
    await mockBookApi(page);
    await page.goto("/for-you");
    const input = page.getByPlaceholder("Search for books");
    const results = page.getByRole("region", { name: "Search results" });

    await input.fill("goggins");
    await expect(results.getByRole("link")).toHaveCount(1);
    await expect(results.getByRole("link", { name: /Can’t Hurt Me/ })).toBeVisible();

    await input.fill("How");
    await expect(results.getByRole("link")).toHaveCount(2);
    await results.getByRole("link", { name: /How to Talk to Anyone/ }).click();
    await expect(page).toHaveURL(/\/book\/18tro3gle2p$/);
    await expect(input).toHaveValue("");
    await expect(results).toHaveCount(0);
  });

  test("shows loading, empty and error states", async ({ page }) => {
    let failing = false;
    await mockBookApi(page, {
      fail: (url) => failing && isSearch(url),
      searchDelay: (term) => (term === "atomic" ? 1200 : 0),
    });
    await page.goto("/for-you");
    const input = page.getByPlaceholder("Search for books");
    const results = page.getByRole("region", { name: "Search results" });

    await input.fill("atomic");
    await expect(results.locator(".skeleton").first()).toBeVisible();
    await expect(results.getByRole("link", { name: /Atomic Habits/ })).toBeVisible();

    await input.fill("zzqqxx");
    await expect(results.getByText("No books found for “zzqqxx”.")).toBeVisible();

    failing = true;
    await input.fill("deep work");
    await expect(results.getByText("Search isn't working right now")).toBeVisible();
    failing = false;
    await results.getByRole("button", { name: "Try again" }).click();
    await expect(results.getByRole("link", { name: /Deep Work/ })).toBeVisible();

    await input.press("Escape");
    await expect(results).toHaveCount(0);
    await page.getByRole("button", { name: "Clear search" }).click();
    await expect(input).toHaveValue("");
  });

  test("is available on app pages but not on the plans page", async ({ page }) => {
    await mockBookApi(page);
    for (const path of ["/for-you", "/library", "/settings", "/book/f9gy1gpai8"]) {
      await page.goto(path);
      await expect(page.getByPlaceholder("Search for books")).toBeVisible();
    }
    await page.goto("/choose-plan");
    await expect(page.getByPlaceholder("Search for books")).toHaveCount(0);
    await expect(page.getByRole("complementary", { name: "Sidebar" })).toHaveCount(0);
  });
});
