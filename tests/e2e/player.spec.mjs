import { expect, test } from "@playwright/test";
import { FREE_BOOK, createUser, loginThroughSidebar, mockBookApi, toSeconds } from "./support.mjs";

async function openPlayer(page) {
  const user = await createUser();
  await mockBookApi(page, { audioSeconds: 30 });
  await page.goto(`/player/${FREE_BOOK.id}`);
  await loginThroughSidebar(page, user);
  await expect(page.getByRole("heading", { level: 1, name: FREE_BOOK.title })).toBeVisible();
  await expect(page.getByTestId("duration")).toHaveText("00:30");
  return user;
}

const currentSeconds = async (page) => toSeconds(await page.getByTestId("current-time").textContent());

test.describe("Reader and audio player", () => {
  test("shows the full summary with preserved line breaks and adjustable text size", async ({ page }) => {
    await openPlayer(page);
    const summary = page.getByText(FREE_BOOK.summary.slice(0, 80));
    await expect(summary).toHaveCSS("white-space", "pre-line");
    await expect(page.locator("article")).toHaveCSS("font-size", "16px");

    const sizes = page.getByRole("group", { name: "Summary text size" }).getByRole("button");
    await sizes.nth(2).click();
    await expect(sizes.nth(2)).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("article")).toHaveCSS("font-size", "22px");
  });

  test("plays, pauses, skips and seeks", async ({ page }) => {
    await openPlayer(page);
    const player = page.getByRole("region", { name: "Audio player" });

    await player.getByRole("button", { name: "Play", exact: true }).click();
    await expect(player.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
    await expect.poll(() => currentSeconds(page), { timeout: 8000 }).toBeGreaterThanOrEqual(1);

    await player.getByRole("button", { name: "Pause", exact: true }).click();
    await expect(player.getByRole("button", { name: "Play", exact: true })).toBeVisible();
    const paused = await currentSeconds(page);
    await page.waitForTimeout(1200);
    expect(await currentSeconds(page)).toBe(paused);

    await player.getByRole("button", { name: "Forward 10 seconds" }).click();
    await expect.poll(() => currentSeconds(page)).toBe(paused + 10);
    await player.getByRole("button", { name: "Rewind 10 seconds" }).click();
    await expect.poll(() => currentSeconds(page)).toBe(paused);

    const slider = player.getByRole("slider", { name: "Seek" });
    const box = await slider.boundingBox();
    await page.mouse.move(box.x + 4, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.75, box.y + box.height / 2, { steps: 8 });
    await page.mouse.up();
    await expect.poll(() => currentSeconds(page)).toBeGreaterThanOrEqual(20);
    expect(await currentSeconds(page)).toBeLessThanOrEqual(25);

    await slider.focus();
    await page.keyboard.press("Home");
    await expect.poll(() => currentSeconds(page)).toBe(0);

    await player.getByRole("button", { name: /Playback speed 1x/ }).click();
    await expect(player.getByRole("button", { name: /Playback speed 1.25x/ })).toBeVisible();
  });

  test("finishing the audio records the book as finished", async ({ page }) => {
    await openPlayer(page);
    const player = page.getByRole("region", { name: "Audio player" });
    const slider = player.getByRole("slider", { name: "Seek" });
    await slider.focus();
    await page.keyboard.press("End");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect.poll(() => currentSeconds(page)).toBe(28);

    await player.getByRole("button", { name: "Play", exact: true }).click();
    await expect(page.getByText("You finished this book! It's now in your library.")).toBeVisible({
      timeout: 15000,
    });
    await expect(player.getByRole("button", { name: "Play", exact: true })).toBeVisible();

    await page.getByRole("complementary", { name: "Sidebar" }).getByRole("link", { name: "My Library" }).click();
    const finished = page.getByRole("list", { name: "Finished" });
    await expect(finished.getByRole("link", { name: FREE_BOOK.title })).toBeVisible();
  });

  test("pauses playback when leaving the player", async ({ page }) => {
    await openPlayer(page);
    const player = page.getByRole("region", { name: "Audio player" });
    await player.getByRole("button", { name: "Play", exact: true }).click();
    await expect(player.getByRole("button", { name: "Pause", exact: true })).toBeVisible();

    await page.getByRole("complementary", { name: "Sidebar" }).getByRole("link", { name: "For you" }).click();
    await expect(page).toHaveURL(/\/for-you$/);
    await expect
      .poll(() => page.evaluate(() => [...document.querySelectorAll("audio")].every((audio) => audio.paused)))
      .toBe(true);
  });

  test("shows a clear error when the audio cannot load", async ({ page }) => {
    const user = await createUser();
    await mockBookApi(page);
    await page.route(/books%2Faudios/, (route) => route.fulfill({ status: 404, body: "" }));
    await page.goto(`/player/${FREE_BOOK.id}`);
    await loginThroughSidebar(page, user);
    await expect(page.getByRole("alert").filter({ hasText: "Audio couldn't be loaded." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  });

  test("logged-out visitors see a login prompt and a locked player", async ({ page }) => {
    await mockBookApi(page);
    await page.goto(`/player/${FREE_BOOK.id}`);
    await expect(page.getByText("Log in to your account to read and listen to the book")).toBeVisible();
    await expect(page.getByText(FREE_BOOK.summary.slice(0, 80))).toHaveCount(0);
    await expect(page.locator("audio")).toHaveCount(0);

    await page.getByRole("region", { name: "Audio player" }).getByRole("button", { name: "Play", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Log in to Summarist" })).toBeVisible();
  });
});
