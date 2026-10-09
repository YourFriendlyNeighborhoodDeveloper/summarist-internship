import { expect, test } from "@playwright/test";
import {
  FREE_BOOK,
  PREMIUM_BOOK,
  createUser,
  loginThroughSidebar,
  mockBookApi,
  openDialog,
  readDocumentAs,
  shelfEntry,
  writeDocumentAs,
} from "./support.mjs";

test.describe("Library", () => {
  test("logged-out visitors are asked to log in", async ({ page }) => {
    await mockBookApi(page);
    await page.goto("/library");
    await expect(page.getByText("Log in to your account to see your library.")).toBeVisible();
    await openDialog(page, page.getByRole("main").getByRole("button", { name: "Login" }));
    await expect(page.getByRole("dialog", { name: "Log in to Summarist" })).toBeVisible();
  });

  test("saves, lists and removes books", async ({ page }) => {
    const user = await createUser();
    await mockBookApi(page);
    await page.goto(`/book/${PREMIUM_BOOK.id}`);
    await loginThroughSidebar(page, user);

    await page.getByRole("button", { name: "Add title to My Library" }).click();
    await expect(page.getByText("Book added to your library.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Saved in My Library" })).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("complementary", { name: "Sidebar" }).getByRole("link", { name: "My Library" }).click();
    const saved = page.getByRole("list", { name: "Saved Books" });
    await expect(saved.getByRole("link", { name: PREMIUM_BOOK.title })).toBeVisible();
    await expect(page.getByText("1 item", { exact: true })).toBeVisible();
    await expect(page.getByText("Done and dusted!")).toBeVisible();

    await page.reload();
    await expect(saved.getByRole("link", { name: PREMIUM_BOOK.title })).toBeVisible();

    await saved.getByRole("button", { name: `Remove ${PREMIUM_BOOK.title} from your library` }).click();
    await expect(page.getByText("Book removed from your library.")).toBeVisible();
    await expect(page.getByText("Save your favorite books!")).toBeVisible();

    await page.goto(`/book/${PREMIUM_BOOK.id}`);
    await expect(page.getByRole("button", { name: "Add title to My Library" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  test("the book page toggle removes a saved book", async ({ page }) => {
    const user = await createUser();
    await mockBookApi(page);
    await page.goto(`/book/${FREE_BOOK.id}`);
    await loginThroughSidebar(page, user);

    await page.getByRole("button", { name: "Add title to My Library" }).click();
    await expect(page.getByRole("button", { name: "Saved in My Library" })).toBeVisible();
    await page.getByRole("button", { name: "Saved in My Library" }).click();
    await expect(page.getByText("Book removed from your library.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add title to My Library" })).toBeVisible();
  });

  test("library records are private to each user and validated", async () => {
    const owner = await createUser();
    const stranger = await createUser();
    const path = `users/${owner.uid}/library/${FREE_BOOK.id}`;

    expect(await writeDocumentAs(owner.idToken, path, shelfEntry(FREE_BOOK), { serverTimestamp: "savedAt" })).toBe(200);
    expect(await readDocumentAs(owner.idToken, path)).toBe(200);
    expect(await readDocumentAs(stranger.idToken, path)).toBe(403);
    expect(
      await writeDocumentAs(stranger.idToken, path, shelfEntry(FREE_BOOK), { serverTimestamp: "savedAt" }),
    ).toBe(403);
    expect(
      await writeDocumentAs(
        owner.idToken,
        path,
        { ...shelfEntry(FREE_BOOK), isAdmin: true },
        { serverTimestamp: "savedAt" },
      ),
    ).toBe(403);
    expect(
      await writeDocumentAs(owner.idToken, `users/${owner.uid}/library/${PREMIUM_BOOK.id}`, shelfEntry(FREE_BOOK), {
        serverTimestamp: "savedAt",
      }),
    ).toBe(403);
    expect(await readDocumentAs(owner.idToken, `customers/${owner.uid}`)).toBe(403);
    expect(await writeDocumentAs(owner.idToken, `stripeEvents/evt_fake`, { type: "fake" })).toBe(403);
  });

  test("guests get temporary, account-specific library data", async ({ page }) => {
    await mockBookApi(page);
    await page.goto(`/book/${FREE_BOOK.id}`);
    const dialog = await openDialog(
      page,
      page.getByRole("complementary", { name: "Sidebar" }).getByRole("button", { name: "Login" }),
    );
    await dialog.getByRole("button", { name: "Login as a Guest" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    await page.getByRole("button", { name: "Add title to My Library" }).click();
    await expect(page.getByText("Book added to your library.")).toBeVisible();
    await page.goto("/library");
    await expect(page.getByText("You're browsing as a guest, so this library is temporary.")).toBeVisible();
    await expect(
      page.getByRole("list", { name: "Saved Books" }).getByRole("link", { name: FREE_BOOK.title }),
    ).toBeVisible();
  });
});
