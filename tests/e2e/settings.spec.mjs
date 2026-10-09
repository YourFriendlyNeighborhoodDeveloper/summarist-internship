import { expect, test } from "@playwright/test";
import { createUser, loginThroughSidebar, mockBookApi, openDialog } from "./support.mjs";

test.describe("Settings", () => {
  test.beforeEach(async ({ page }) => {
    await mockBookApi(page);
  });

  test("logged-out visitors see the login view", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
    await expect(page.getByText("Log in to your account to see your details.")).toBeVisible();
    await openDialog(page, page.getByRole("main").getByRole("button", { name: "Login" }));
    await expect(page.getByRole("dialog", { name: "Log in to Summarist" })).toBeVisible();
  });

  test("basic members see their plan, email, upgrade and logout controls", async ({ page }) => {
    const user = await createUser();
    await page.goto("/settings");
    await loginThroughSidebar(page, user);

    await expect(page.getByTestId("plan-name")).toHaveText("Basic");
    await expect(page.getByText(user.email)).toBeVisible();
    const upgrade = page.getByRole("main").getByRole("link", { name: "Upgrade to Premium" });
    await expect(upgrade).toHaveAttribute("href", "/choose-plan");

    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page.getByText("Log in to your account to see your details.")).toBeVisible();
  });
});
