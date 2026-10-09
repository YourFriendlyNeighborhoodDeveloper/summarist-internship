import { expect, test } from "@playwright/test";
import { openDialog } from "./support.mjs";

test.describe("Landing page", () => {
  test("renders every section with the supplied assets", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1, name: /Gain more knowledge/ })).toBeVisible();
    await expect(page.getByRole("img", { name: "Summarist" })).toBeVisible();
    for (const name of [
      "Understand books in few minutes",
      "What our members say",
      "Start growing with Summarist now",
    ]) {
      await expect(page.getByRole("heading", { name })).toBeVisible();
    }
    for (const feature of ["Read or listen", "Find your next read", "Briefcasts"]) {
      await expect(page.getByRole("heading", { name: feature })).toBeVisible();
    }
    await expect(page.getByText("Hanna M.")).toBeVisible();
    await expect(page.getByText("3 Million")).toBeVisible();
    await expect(page.getByText("Copyright © 2023 Summarist.")).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect
      .poll(() =>
        page.$$eval("img", (images) =>
          images.filter((image) => !image.getAttribute("src") || (image.complete && image.naturalWidth === 0)).length,
        ),
      )
      .toBe(0);
  });

  test("does not show the app sidebar or search bar", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByPlaceholder("Search for books")).toHaveCount(0);
    await expect(page.getByRole("complementary", { name: "Sidebar" })).toHaveCount(0);
  });

  test("highlights a different statistics heading every two seconds", async ({ page }) => {
    await page.goto("/");
    const first = page.getByText("Enhance your knowledge");
    const second = page.getByText("Achieve greater success");
    await expect(first).toHaveCSS("color", "rgb(43, 217, 124)");
    await expect(second).toHaveCSS("color", "rgb(43, 217, 124)", { timeout: 4000 });
    await expect(first).not.toHaveCSS("color", "rgb(43, 217, 124)");
  });

  test("login buttons open an accessible auth modal that can be dismissed", async ({ page }) => {
    await page.goto("/");
    const dialog = page.getByRole("dialog", { name: "Log in to Summarist" });
    const loginButtons = page.getByRole("button", { name: "Login", exact: true });
    await expect(loginButtons).toHaveCount(3);

    await openDialog(page, loginButtons.first());
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden();

    await loginButtons.nth(1).click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    await loginButtons.nth(2).click();
    await expect(dialog).toBeVisible();
    await page.mouse.click(10, 10);
    await expect(dialog).toBeHidden();
  });

  test("switches between login, sign up and password reset views", async ({ page }) => {
    await page.goto("/");
    const dialog = await openDialog(page, page.getByRole("button", { name: "Login", exact: true }).first());

    await dialog.getByRole("button", { name: "Don't have an account?" }).click();
    await expect(dialog.getByRole("heading", { name: "Sign up to Summarist" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Sign up", exact: true })).toBeVisible();

    await dialog.getByRole("button", { name: "Already have an account?" }).click();
    await dialog.getByRole("button", { name: "Forgot your password?" }).click();
    await expect(dialog.getByRole("heading", { name: "Reset your password" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Send reset password link" })).toBeVisible();

    await dialog.getByRole("button", { name: "Go to login" }).click();
    await expect(dialog.getByRole("heading", { name: "Log in to Summarist" })).toBeVisible();
  });
});
