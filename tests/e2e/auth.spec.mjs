import { expect, test } from "@playwright/test";
import { createUser, loginThroughSidebar, mockBookApi, openDialog, uniqueEmail } from "./support.mjs";

async function openModal(page, view = "login") {
  await page.goto("/");
  const dialog = await openDialog(page, page.getByRole("button", { name: "Login", exact: true }).first());
  if (view === "register") await dialog.getByRole("button", { name: "Don't have an account?" }).click();
  if (view === "forgot") await dialog.getByRole("button", { name: "Forgot your password?" }).click();
  return dialog;
}

test.describe("Authentication", () => {
  test.beforeEach(async ({ page }) => {
    await mockBookApi(page);
  });

  test("registers with email and password, then lands on For You", async ({ page }) => {
    const dialog = await openModal(page, "register");
    await dialog.getByPlaceholder("Email Address").fill(uniqueEmail("new"));
    await dialog.getByPlaceholder("Password").fill("summarist123");
    await dialog.getByRole("button", { name: "Sign up", exact: true }).click();

    await expect(page).toHaveURL(/\/for-you$/);
    await expect(dialog).toBeHidden();
    await expect(
      page.getByRole("complementary", { name: "Sidebar" }).getByRole("button", { name: "Logout" }),
    ).toBeVisible();
  });

  test("validates email and password on sign up", async ({ page }) => {
    const existing = await createUser();
    const dialog = await openModal(page, "register");
    const email = dialog.getByPlaceholder("Email Address");
    const password = dialog.getByPlaceholder("Password");
    const submit = dialog.getByRole("button", { name: "Sign up", exact: true });

    await email.fill("not-an-email");
    await password.fill("summarist123");
    await submit.click();
    await expect(dialog.getByRole("alert")).toHaveText("Please enter a valid email address.");

    await email.fill(uniqueEmail());
    await password.fill("123");
    await submit.click();
    await expect(dialog.getByRole("alert")).toHaveText("Your password must be at least 6 characters.");

    await email.fill(existing.email);
    await password.fill("summarist123");
    await submit.click();
    await expect(dialog.getByRole("alert")).toContainText("already exists");
  });

  test("shows useful errors for failed logins", async ({ page }) => {
    const user = await createUser();
    const dialog = await openModal(page);
    const email = dialog.getByPlaceholder("Email Address");
    const password = dialog.getByPlaceholder("Password");
    const submit = dialog.getByRole("button", { name: "Login", exact: true });

    await submit.click();
    await expect(dialog.getByRole("alert")).toHaveText("Please enter your email address.");

    await email.fill("missing@");
    await password.fill("whatever");
    await submit.click();
    await expect(dialog.getByRole("alert")).toHaveText("Please enter a valid email address.");

    await email.fill(uniqueEmail("ghost"));
    await submit.click();
    await expect(dialog.getByRole("alert")).toHaveText(/No account was found|incorrect/);

    await email.fill(user.email);
    await password.fill("wrong-password");
    await submit.click();
    await expect(dialog.getByRole("alert")).toHaveText(/incorrect/);
    await expect(page).toHaveURL("/");
  });

  test("logs in, persists the session across reloads and logs out", async ({ page }) => {
    const user = await createUser();
    const dialog = await openModal(page);
    await dialog.getByPlaceholder("Email Address").fill(user.email);
    await dialog.getByPlaceholder("Password").fill(user.password);
    await dialog.getByRole("button", { name: "Login", exact: true }).click();
    await expect(page).toHaveURL(/\/for-you$/);

    await page.goto("/settings");
    await expect(page.getByText(user.email)).toBeVisible();
    await page.reload();
    await expect(page.getByText(user.email)).toBeVisible();

    const sidebar = page.getByRole("complementary", { name: "Sidebar" });
    await sidebar.getByRole("button", { name: "Logout" }).click();
    await expect(page.getByText("You have logged out successfully.")).toBeVisible();
    await expect(sidebar.getByRole("button", { name: "Login" })).toBeVisible();
    await expect(page.getByText("Log in to your account to see your details.")).toBeVisible();
  });

  test("logs in as a guest with Firebase anonymous auth", async ({ page }) => {
    const dialog = await openModal(page);
    await dialog.getByRole("button", { name: "Login as a Guest" }).click();
    await expect(page).toHaveURL(/\/for-you$/);

    await page.goto("/settings");
    await expect(page.getByText("Guest account")).toBeVisible();
    await expect(page.getByTestId("plan-name")).toHaveText("Basic");
  });

  test("a guest can upgrade to a full account and keep the same identity", async ({ page }) => {
    const dialog = await openModal(page);
    await dialog.getByRole("button", { name: "Login as a Guest" }).click();
    await expect(page).toHaveURL(/\/for-you$/);

    await page.goto("/settings");
    await openDialog(page, page.getByRole("button", { name: "Sign up to upgrade" }));
    const signUp = page.getByRole("dialog", { name: "Sign up to Summarist" });
    const email = uniqueEmail("upgraded");
    await signUp.getByPlaceholder("Email Address").fill(email);
    await signUp.getByPlaceholder("Password").fill("summarist123");
    await signUp.getByRole("button", { name: "Sign up", exact: true }).click();
    await expect(signUp).toBeHidden();
    await expect(page.getByText(email)).toBeVisible();
  });

  test("sends a password reset email", async ({ page }) => {
    const user = await createUser();
    const dialog = await openModal(page, "forgot");
    await dialog.getByPlaceholder("Email Address").fill(user.email);
    await dialog.getByRole("button", { name: "Send reset password link" }).click();
    await expect(dialog.getByRole("status")).toContainText("Check your inbox");
  });

  test("the sidebar login keeps the visitor on the current page", async ({ page }) => {
    const user = await createUser();
    await page.goto("/settings");
    await loginThroughSidebar(page, user);
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByText(user.email)).toBeVisible();
  });
});
