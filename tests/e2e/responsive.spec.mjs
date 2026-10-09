import { expect, test } from "@playwright/test";
import { FREE_BOOK, PREMIUM_BOOK, mockBookApi } from "./support.mjs";

const PAGES = ["/", "/for-you", `/book/${PREMIUM_BOOK.id}`, `/player/${FREE_BOOK.id}`, "/choose-plan", "/settings", "/library"];

test.describe("Responsive layout", () => {
  test.beforeEach(async ({ page }) => {
    await mockBookApi(page);
  });

  for (const path of PAGES) {
    test(`has no horizontal overflow on ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test("the sidebar becomes a drawer opened from the search bar", async ({ page }) => {
    await page.goto("/for-you");
    const sidebar = page.getByRole("complementary", { name: "Sidebar" });
    await expect(sidebar).toBeHidden();

    const toggle = page.getByRole("button", { name: "Open menu" });
    await toggle.click();
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "For you" })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(sidebar).toBeHidden();

    await toggle.click();
    await expect(sidebar).toBeVisible();
    await sidebar.getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(sidebar).toBeHidden();
  });

  test("search works on small screens", async ({ page }) => {
    await page.goto("/for-you");
    await page.getByPlaceholder("Search for books").fill("habits");
    const result = page.getByRole("region", { name: "Search results" }).getByRole("link", { name: /Atomic Habits/ });
    await expect(result).toBeVisible();
    await expect(result).toBeInViewport();
  });

  test("player controls stay reachable above the content", async ({ page }) => {
    await page.goto(`/player/${FREE_BOOK.id}`);
    const player = page.getByRole("region", { name: "Audio player" });
    await expect(player.getByRole("button", { name: "Play", exact: true })).toBeInViewport();
    await expect(player.getByRole("slider", { name: "Seek" })).toBeInViewport();
  });
});

test.describe("Desktop navigation", () => {
  test.use({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false });

  test("shows the sidebar permanently on large screens", async ({ page }) => {
    await mockBookApi(page);
    await page.goto("/for-you");
    const sidebar = page.getByRole("complementary", { name: "Sidebar" });
    await expect(sidebar).toBeVisible();
    await expect(page.getByRole("button", { name: "Open menu" })).toBeHidden();
    await expect(sidebar.getByRole("link", { name: "For you" })).toHaveAttribute("aria-current", "page");
    for (const name of ["Highlights", "Search", "Help & Support"]) {
      await expect(sidebar.getByRole("button", { name })).toHaveAttribute("aria-disabled", "true");
    }
    await sidebar.getByRole("button", { name: "Highlights" }).click({ force: true });
    await expect(page).toHaveURL(/\/for-you$/);
  });
});
