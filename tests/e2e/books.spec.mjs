import { expect, test } from "@playwright/test";
import { FREE_BOOK, PREMIUM_BOOK, books, mockBookApi } from "./support.mjs";

test.describe("Book discovery", () => {
  test("For You renders the selected, recommended and suggested books from the API", async ({ page }) => {
    await mockBookApi(page);
    await page.goto("/for-you");

    const selected = books.selected[0];
    await expect(page.getByRole("heading", { name: "Selected just for you" })).toBeVisible();
    await expect(page.getByRole("link", { name: selected.subTitle })).toBeVisible();

    const recommended = page.getByRole("list", { name: "Recommended For You" });
    const suggested = page.getByRole("list", { name: "Suggested Books" });
    await expect(recommended.getByRole("listitem")).toHaveCount(books.recommended.length);
    await expect(suggested.getByRole("listitem")).toHaveCount(books.suggested.length);
    await expect(recommended.getByText(books.recommended[0].author)).toBeVisible();
    await expect(recommended.getByText(String(books.recommended[0].averageRating)).first()).toBeVisible();
  });

  test("shows the Premium pill only on books that require a subscription", async ({ page }) => {
    await mockBookApi(page);
    await page.goto("/for-you");

    const recommended = page.getByRole("list", { name: "Recommended For You" });
    await expect(recommended.getByRole("listitem")).toHaveCount(books.recommended.length);
    await expect(recommended.getByText("Premium", { exact: true })).toHaveCount(
      books.recommended.filter((book) => book.subscriptionRequired).length,
    );

    const freeCard = recommended.getByRole("link", { name: FREE_BOOK.title });
    await expect(freeCard.getByText("Premium", { exact: true })).toHaveCount(0);
    const premiumBook = books.recommended.find((book) => book.subscriptionRequired);
    await expect(
      recommended.getByRole("link", { name: premiumBook.title }).getByText("Premium", { exact: true }),
    ).toBeVisible();
  });

  test("shows skeletons while books load", async ({ page }) => {
    await mockBookApi(page, { delay: 1500 });
    await page.goto("/for-you");
    await expect(page.getByRole("status", { name: "Loading the selected book" })).toBeVisible();
    await expect(page.getByRole("status", { name: "Loading recommended for you" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Recommended For You" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("status", { name: "Loading the selected book" })).toHaveCount(0);
  });

  test("shows an error with a working retry when the API is unavailable", async ({ page }) => {
    let failing = true;
    await mockBookApi(page, { fail: () => failing });
    await page.goto("/for-you");

    await expect(page.getByText("We couldn't load the selected book")).toBeVisible();
    await expect(page.getByText("We couldn't load these books")).toHaveCount(2);

    failing = false;
    const retryButtons = page.getByRole("button", { name: "Try again" });
    await expect(retryButtons).toHaveCount(3);
    for (const index of [2, 1, 0]) await retryButtons.nth(index).click();
    await expect(page.getByRole("list", { name: "Recommended For You" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Suggested Books" })).toBeVisible();
    await expect(page.getByRole("link", { name: books.selected[0].subTitle })).toBeVisible();
  });

  test("a card opens the book page with all of its details", async ({ page }) => {
    await mockBookApi(page);
    await page.goto("/for-you");
    await page.getByRole("link", { name: books.selected[0].subTitle }).click();

    await expect(page).toHaveURL(`/book/${PREMIUM_BOOK.id}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`${PREMIUM_BOOK.title} (Premium)`);
    const visibleText = (text, options) => page.getByText(text, options).filter({ visible: true });
    await expect(visibleText(PREMIUM_BOOK.author, { exact: true })).toBeVisible();
    await expect(visibleText(PREMIUM_BOOK.subTitle, { exact: true })).toBeVisible();
    await expect(
      visibleText(`${PREMIUM_BOOK.averageRating.toFixed(1)} (${PREMIUM_BOOK.totalRating} ratings)`),
    ).toBeVisible();
    await expect(visibleText(`${PREMIUM_BOOK.keyIdeas} Key ideas`)).toBeVisible();
    await expect(visibleText(PREMIUM_BOOK.type, { exact: true })).toBeVisible();
    await expect(page.getByRole("list", { name: "Tags" }).getByRole("listitem")).toHaveText(PREMIUM_BOOK.tags);
    await expect(page.getByRole("heading", { name: "What's it about?" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "About the author" })).toBeVisible();
    await expect(visibleText(PREMIUM_BOOK.authorDescription.slice(0, 60))).toBeVisible();
    await expect(page.getByRole("img", { name: `Cover of ${PREMIUM_BOOK.title}` })).toBeVisible();
    for (const name of ["Read", "Listen", "Add title to My Library"]) {
      await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
    }
  });

  test("free books are not labelled Premium", async ({ page }) => {
    await mockBookApi(page);
    await page.goto(`/book/${FREE_BOOK.id}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(FREE_BOOK.title);
  });

  test("unknown and malformed book ids show a not-found state", async ({ page }) => {
    const requests = [];
    await mockBookApi(page, { onRequest: (url) => requests.push(url.search) });

    await page.goto("/book/this-book-does-not-exist");
    await expect(page.getByText("We couldn't find that book")).toBeVisible();
    await page.getByRole("link", { name: "Browse books" }).click();
    await expect(page).toHaveURL(/\/for-you$/);

    await page.goto("/book/bad%24id%20here");
    await expect(page.getByText("We couldn't find that book").filter({ visible: true })).toBeVisible();
    expect(requests.some((search) => search.includes("bad"))).toBe(false);
  });

  test("unknown routes render the 404 page", async ({ page }) => {
    const response = await page.goto("/definitely-not-a-page");
    expect(response.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "We couldn't find that page" })).toBeVisible();
  });
});
