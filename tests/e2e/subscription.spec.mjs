import { expect, test } from "@playwright/test";
import {
  activateSubscription,
  checkoutCompletedEvent,
  createGuestUser,
  createUser,
  invoiceEvent,
  loginThroughSidebar,
  mockBookApi,
  openDialog,
  readDocument,
  sendWebhook,
  subscriptionEvent,
} from "./support.mjs";

const checkout = (request, { token, body = { plan: "premium-plus" } } = {}) =>
  request.post("/api/checkout", {
    data: typeof body === "string" ? body : JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });

test.describe("Plans page", () => {
  test("offers Basic, Premium and Premium Plus with working selection", async ({ page }) => {
    await page.goto("/choose-plan");
    await expect(page.getByRole("heading", { name: "Get unlimited access to many amazing books to read" })).toBeVisible();
    await expect(page.getByText("Key ideas in few min")).toBeVisible();

    const yearly = page.getByRole("radio", { name: /Premium Plus Yearly/ });
    const monthly = page.getByRole("radio", { name: /Premium Monthly/ });
    const basic = page.getByRole("radio", { name: /Basic/ });
    await expect(yearly).toBeChecked();
    await expect(page.getByText("$99.99/year")).toBeVisible();
    await expect(page.getByText("$9.99/month")).toBeVisible();
    await expect(page.getByRole("button", { name: "Start your free 7-day trial" })).toBeVisible();
    await expect(page.getByText("Cancel your trial at any time before it ends, and you won’t be charged.")).toBeVisible();

    await page.getByText("Premium Monthly").click();
    await expect(monthly).toBeChecked();
    await expect(page.getByRole("button", { name: "Start your first month" })).toBeVisible();
    await expect(page.getByText("30-day money back guarantee, no questions asked.")).toBeVisible();

    await monthly.press("ArrowDown");
    await expect(basic).toBeChecked();
    await expect(page.getByRole("button", { name: "Continue with Basic" })).toBeVisible();
  });

  test("FAQ accordion expands one answer at a time", async ({ page }) => {
    await page.goto("/choose-plan");
    const first = page.getByRole("button", { name: "How does the free 7-day trial work?" });
    const second = page.getByRole("button", { name: /Can I switch subscriptions/ });
    await expect(first).toHaveAttribute("aria-expanded", "true");
    await expect(second).toHaveAttribute("aria-expanded", "false");

    await second.click();
    await expect(second).toHaveAttribute("aria-expanded", "true");
    await expect(first).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("region", { name: /Can I switch subscriptions/ })).toContainText(
      "While an annual plan is active",
    );

    await second.click();
    await expect(second).toHaveAttribute("aria-expanded", "false");
  });

  test("logged-out visitors are asked to log in before checkout", async ({ page }) => {
    await page.goto("/choose-plan");
    await openDialog(page, page.getByRole("button", { name: "Start your free 7-day trial" }));
    await expect(page.getByRole("dialog", { name: "Log in to Summarist" })).toContainText(
      "Log in or sign up to start your subscription.",
    );
  });

  test("guests are asked to create an account before checkout", async ({ page }) => {
    await page.goto("/choose-plan");
    const dialog = await openDialog(page, page.getByRole("button", { name: "Start your free 7-day trial" }));
    await dialog.getByRole("button", { name: "Login as a Guest" }).click();
    await expect(dialog).toBeHidden();

    await page.getByRole("button", { name: "Start your free 7-day trial" }).click();
    await expect(page.getByRole("dialog", { name: "Sign up to Summarist" })).toContainText(
      "Guest accounts can't subscribe.",
    );
  });

  test("checkout reports that Stripe is not configured instead of failing silently", async ({ page }) => {
    const user = await createUser();
    await mockBookApi(page);
    await page.goto("/settings");
    await loginThroughSidebar(page, user);
    await page.getByRole("main").getByRole("link", { name: "Upgrade to Premium" }).click();
    await expect(page).toHaveURL(/\/choose-plan$/);

    await page.getByRole("button", { name: "Start your free 7-day trial" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Payments aren't configured yet" })).toBeVisible();
    await expect(page).toHaveURL(/\/choose-plan$/);
  });

  test("shows a notice when checkout was cancelled", async ({ page }) => {
    await page.goto("/choose-plan?checkout=cancelled");
    await expect(page.getByText("Checkout was canceled, so you haven't been charged.")).toBeVisible();
  });
});

test.describe("Checkout API", () => {
  test("authenticates and validates every request on the server", async ({ request }) => {
    expect((await checkout(request)).status()).toBe(401);
    expect((await checkout(request, { token: "not-a-real-token" })).status()).toBe(401);

    const guest = await createGuestUser();
    const guestResponse = await checkout(request, { token: guest.idToken });
    expect(guestResponse.status()).toBe(403);
    expect((await guestResponse.json()).code).toBe("guest_account");

    const user = await createUser();
    const invalidPlan = await checkout(request, { token: user.idToken, body: { plan: "lifetime", price: 1 } });
    expect(invalidPlan.status()).toBe(400);
    expect((await invalidPlan.json()).code).toBe("invalid_plan");
    expect((await checkout(request, { token: user.idToken, body: "{not json" })).status()).toBe(400);

    const unconfigured = await checkout(request, { token: user.idToken, body: { plan: "premium" } });
    expect(unconfigured.status()).toBe(503);
    expect((await unconfigured.json()).code).toBe("stripe_not_configured");

    await activateSubscription(request, user.uid);
    const duplicate = await checkout(request, { token: user.idToken });
    expect(duplicate.status()).toBe(409);
    expect((await duplicate.json()).code).toBe("already_subscribed");
  });

  test("billing portal requires a registered user", async ({ request }) => {
    expect((await request.post("/api/billing-portal")).status()).toBe(401);
    const user = await createUser();
    const response = await request.post("/api/billing-portal", {
      headers: { authorization: `Bearer ${user.idToken}` },
    });
    expect(response.status()).toBe(404);
    expect((await response.json()).code).toBe("no_customer");
  });
});

test.describe("Stripe webhook", () => {
  test("rejects missing and invalid signatures", async ({ request }) => {
    const user = await createUser();
    const event = subscriptionEvent({ uid: user.uid });

    const missing = await sendWebhook(request, event, { signature: "" });
    expect(missing.status()).toBe(400);
    const forged = await sendWebhook(request, event, { secret: "whsec_attacker" });
    expect(forged.status()).toBe(400);
    expect((await forged.json()).code).toBe("invalid_signature");
    expect(await readDocument(`subscriptions/${user.uid}`)).toBeNull();
  });

  test("processes subscription lifecycle events idempotently and in order", async ({ request }) => {
    const user = await createUser();
    const base = Math.floor(Date.now() / 1000);
    const ids = { subscriptionId: `sub_${base}_${user.uid.slice(0, 6)}`, customerId: `cus_${user.uid.slice(0, 10)}` };

    const created = subscriptionEvent({ uid: user.uid, ...ids, status: "trialing", created: base });
    const first = await sendWebhook(request, created);
    expect(first.status()).toBe(200);
    expect((await first.json()).outcome).toBe("synced");
    let record = await readDocument(`subscriptions/${user.uid}`);
    expect(record).toMatchObject({ status: "trialing", plan: "premium-plus", subscriptionId: ids.subscriptionId });
    expect(record.trialEnd).toBeGreaterThan(Date.now());

    const replay = await sendWebhook(request, created);
    expect((await replay.json()).outcome).toBe("duplicate");

    const stale = subscriptionEvent({ uid: user.uid, ...ids, type: "customer.subscription.updated", status: "incomplete", created: base - 60 });
    expect((await (await sendWebhook(request, stale)).json()).outcome).toBe("stale");
    expect((await readDocument(`subscriptions/${user.uid}`)).status).toBe("trialing");

    const active = subscriptionEvent({ uid: user.uid, ...ids, type: "customer.subscription.updated", status: "active", created: base + 10 });
    expect((await (await sendWebhook(request, active)).json()).outcome).toBe("synced");
    expect((await readDocument(`subscriptions/${user.uid}`)).status).toBe("active");

    const paid = invoiceEvent({ uid: user.uid, ...ids, created: base + 11 });
    expect((await (await sendWebhook(request, paid)).json()).outcome).toBe("recorded");
    expect((await readDocument(`subscriptions/${user.uid}`)).latestInvoice).toMatchObject({ paid: true, status: "paid" });

    const canceled = subscriptionEvent({ uid: user.uid, ...ids, type: "customer.subscription.deleted", status: "canceled", created: base + 20 });
    expect((await (await sendWebhook(request, canceled)).json()).outcome).toBe("synced");
    expect((await readDocument(`subscriptions/${user.uid}`)).status).toBe("canceled");

    const resurrect = subscriptionEvent({ uid: user.uid, ...ids, type: "customer.subscription.updated", status: "active", created: base + 30 });
    expect((await (await sendWebhook(request, resurrect)).json()).outcome).toBe("stale");
    expect((await readDocument(`subscriptions/${user.uid}`)).status).toBe("canceled");

    expect((await readDocument(`stripeEvents/${created.id}`)).outcome).toBe("synced");
    expect(await readDocument(`stripeCustomers/${ids.customerId}`)).toMatchObject({ uid: user.uid });
  });

  test("links Stripe customers from completed checkouts", async ({ request }) => {
    const user = await createUser();
    const event = checkoutCompletedEvent({ uid: user.uid });
    const response = await sendWebhook(request, event);
    expect((await response.json()).outcome).toBe("linked");

    const customerId = event.data.object.customer;
    expect(await readDocument(`customers/${user.uid}`)).toMatchObject({ stripeCustomerId: customerId });
    expect(await readDocument(`stripeCustomers/${customerId}`)).toMatchObject({ uid: user.uid });
    expect(await readDocument(`subscriptions/${user.uid}`)).toBeNull();
  });

  test("acknowledges events it cannot map to a user", async ({ request }) => {
    const event = subscriptionEvent({ uid: null });
    const response = await sendWebhook(request, event);
    expect(response.status()).toBe(200);
    expect((await response.json()).outcome).toBe("unmapped");

    const ignored = await sendWebhook(request, { ...event, id: `${event.id}_other`, type: "charge.refunded" });
    expect((await ignored.json()).outcome).toBe("ignored");
  });

  test("settings reflect the verified plan and cancellation", async ({ page, request }) => {
    const user = await createUser();
    const ids = { subscriptionId: `sub_ui_${user.uid.slice(0, 8)}`, customerId: `cus_ui_${user.uid.slice(0, 8)}` };
    const base = Math.floor(Date.now() / 1000);
    await activateSubscription(request, user.uid, { ...ids, status: "trialing", plan: "premium-plus", created: base });

    await mockBookApi(page);
    await page.goto("/settings?checkout=success");
    await loginThroughSidebar(page, user);
    await expect(page.getByTestId("plan-name")).toHaveText("Premium Plus");
    await expect(page.getByText(/Your free trial ends on/)).toBeVisible();
    await expect(page.getByText("Your subscription is active. Enjoy unlimited access!")).toBeVisible();
    await expect(page.getByRole("button", { name: "Manage subscription" })).toBeVisible();

    await sendWebhook(
      request,
      subscriptionEvent({ uid: user.uid, ...ids, type: "customer.subscription.updated", status: "active", plan: "premium", created: base + 5 }),
    );
    await expect(page.getByTestId("plan-name")).toHaveText("Premium");
    await expect(page.getByText(/Renews on/)).toBeVisible();

    await sendWebhook(
      request,
      subscriptionEvent({ uid: user.uid, ...ids, type: "customer.subscription.deleted", status: "canceled", plan: "premium", created: base + 10 }),
    );
    await expect(page.getByTestId("plan-name")).toHaveText("Basic");
    await expect(page.getByRole("main").getByRole("link", { name: "Upgrade to Premium" })).toBeVisible();
  });
});
