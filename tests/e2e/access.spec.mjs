import { expect, test } from "@playwright/test";
import {
  FREE_BOOK,
  PREMIUM_BOOK,
  activateSubscription,
  createUser,
  loginThroughSidebar,
  mockBookApi,
  writeDocumentAs,
} from "./support.mjs";

test.describe("Reading and listening access rules", () => {
  test.beforeEach(async ({ page }) => {
    await mockBookApi(page);
  });

  test("logged-out visitors get the auth modal for Read, Listen and Save", async ({ page }) => {
    await page.goto(`/book/${FREE_BOOK.id}`);
    const dialog = page.getByRole("dialog", { name: "Log in to Summarist" });

    for (const name of ["Read", "Listen", "Add title to My Library"]) {
      await page.getByRole("button", { name, exact: true }).click();
      await expect(dialog).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
    }
    await expect(page).toHaveURL(`/book/${FREE_BOOK.id}`);
  });

  test("basic members can open free books in the player", async ({ page }) => {
    const user = await createUser();
    await page.goto(`/book/${FREE_BOOK.id}`);
    await loginThroughSidebar(page, user);

    await page.getByRole("button", { name: "Read", exact: true }).click();
    await expect(page).toHaveURL(`/player/${FREE_BOOK.id}`);
    await expect(page.getByRole("heading", { level: 1, name: FREE_BOOK.title })).toBeVisible();
    await expect(page.getByText(FREE_BOOK.summary.slice(0, 80))).toBeVisible();
  });

  test("basic members are sent to the plans page for premium books", async ({ page }) => {
    const user = await createUser();
    await page.goto(`/book/${PREMIUM_BOOK.id}`);
    await loginThroughSidebar(page, user);

    await page.getByRole("button", { name: "Listen", exact: true }).click();
    await expect(page).toHaveURL(/\/choose-plan$/);
    await expect(page.getByText(`“${PREMIUM_BOOK.title}” is only available to Premium members.`)).toBeVisible();
  });

  test("basic members cannot open a premium player URL directly", async ({ page }) => {
    const user = await createUser();
    await page.goto("/settings");
    await loginThroughSidebar(page, user);

    await page.goto(`/player/${PREMIUM_BOOK.id}`);
    await expect(page).toHaveURL(/\/choose-plan$/);
  });

  test("a client cannot grant itself a subscription", async ({ page }) => {
    const user = await createUser();
    const status = await writeDocumentAs(user.idToken, `subscriptions/${user.uid}`, {
      status: "active",
      plan: "premium-plus",
    });
    expect(status).toBe(403);

    await page.addInitScript(() => {
      window.localStorage.setItem("subscriptionPlan", "premium-plus");
      window.localStorage.setItem("isSubscribed", "true");
    });
    await page.goto("/settings");
    await loginThroughSidebar(page, user);
    await expect(page.getByTestId("plan-name")).toHaveText("Basic");

    await page.goto(`/book/${PREMIUM_BOOK.id}`);
    await page.getByRole("button", { name: "Read", exact: true }).click();
    await expect(page).toHaveURL(/\/choose-plan$/);
  });

  test("members with a verified subscription can open premium books", async ({ page, request }) => {
    const user = await createUser();
    await activateSubscription(request, user.uid, { status: "trialing", plan: "premium-plus" });

    await page.goto(`/book/${PREMIUM_BOOK.id}`);
    await loginThroughSidebar(page, user);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(PREMIUM_BOOK.title);

    await page.getByRole("button", { name: "Read", exact: true }).click();
    await expect(page).toHaveURL(`/player/${PREMIUM_BOOK.id}`);
    await expect(page.getByText(PREMIUM_BOOK.summary.slice(0, 80))).toBeVisible();

    await page.goto("/for-you");
    await expect(page.getByRole("list", { name: "Recommended For You" })).toBeVisible();
    await expect(page.getByText("Premium", { exact: true })).toHaveCount(0);
  });
});
