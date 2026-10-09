import { readFileSync } from "node:fs";
import { expect } from "@playwright/test";
import Stripe from "stripe";

export const PROJECT_ID = "demo-summarist";
export const API_KEY = "demo-api-key";
export const WEBHOOK_SECRET = "whsec_e2e_local_only_secret";
export const PRICES = { premium: "price_e2e_monthly", "premium-plus": "price_e2e_yearly" };

const AUTH_EMULATOR = "http://127.0.0.1:9099";
const FIRESTORE_EMULATOR = "http://127.0.0.1:8080";
const DOCUMENTS = `projects/${PROJECT_ID}/databases/(default)/documents`;
const BOOK_API = "https://us-central1-summaristt.cloudfunctions.net";

const fixture = JSON.parse(readFileSync(new URL("../fixtures/books.json", import.meta.url), "utf8"));

export const books = {
  selected: fixture.selected,
  recommended: fixture.recommended,
  suggested: fixture.suggested,
};
export const allBooks = [
  ...new Map(
    [...fixture.selected, ...fixture.recommended, ...fixture.suggested].map((book) => [book.id, book]),
  ).values(),
];
export const FREE_BOOK = allBooks.find((book) => !book.subscriptionRequired);
export const PREMIUM_BOOK = fixture.selected[0];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const random = () => Math.random().toString(36).slice(2, 10);

export function makeWav(seconds, sampleRate = 8000) {
  const samples = Math.round(seconds * sampleRate);
  const buffer = Buffer.alloc(44 + samples, 128);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + samples, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate, 28);
  buffer.writeUInt16LE(1, 32);
  buffer.writeUInt16LE(8, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples, 40);
  return buffer;
}

function fulfillJson(route, body) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    headers: { "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(body),
  });
}

async function serveAudio(route, wav) {
  const range = route.request().headers().range;
  const match = range && /bytes=(\d+)-(\d*)/.exec(range);
  if (!match) {
    return route.fulfill({
      status: 200,
      headers: { "Content-Type": "audio/wav", "Accept-Ranges": "bytes" },
      body: wav,
    });
  }
  const start = Number(match[1]);
  const end = match[2] ? Math.min(Number(match[2]), wav.length - 1) : wav.length - 1;
  return route.fulfill({
    status: 206,
    headers: {
      "Content-Type": "audio/wav",
      "Accept-Ranges": "bytes",
      "Content-Range": `bytes ${start}-${end}/${wav.length}`,
    },
    body: wav.subarray(start, end + 1),
  });
}

async function respond(route, url, { delay, fail, searchDelay }) {
  if (delay) await sleep(delay);
  if (fail(url)) {
    await route.fulfill({
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: "Internal Server Error",
    });
    return;
  }
  const endpoint = url.pathname.split("/").pop();
  if (endpoint === "getBooks") {
    await fulfillJson(route, books[url.searchParams.get("status")] ?? []);
    return;
  }
  if (endpoint === "getBook") {
    const book = allBooks.find((item) => item.id === url.searchParams.get("id"));
    if (book) {
      await fulfillJson(route, book);
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: "",
    });
    return;
  }
  if (endpoint === "getBooksByAuthorOrTitle") {
    const term = (url.searchParams.get("search") ?? "").toLowerCase();
    const wait = searchDelay(term);
    if (wait) await sleep(wait);
    await fulfillJson(
      route,
      allBooks.filter(
        (book) => book.title.toLowerCase().includes(term) || book.author.toLowerCase().includes(term),
      ),
    );
    return;
  }
  await route.fulfill({ status: 404, body: "" });
}

export async function mockBookApi(page, options = {}) {
  const { delay = 0, fail = () => false, searchDelay = () => 0, onRequest, audioSeconds = 30 } = options;
  const wav = makeWav(audioSeconds);

  await page.route(/firebasestorage\.googleapis\.com\/.*books%2Faudios/, (route) =>
    serveAudio(route, wav).catch(() => {}),
  );

  await page.route(`${BOOK_API}/**`, (route) => {
    const url = new URL(route.request().url());
    onRequest?.(url, Date.now());
    return respond(route, url, { delay, fail, searchDelay }).catch(() => {});
  });
}

export function uniqueEmail(prefix = "reader") {
  return `${prefix}-${Date.now()}-${random()}@example.com`;
}

async function authRequest(body) {
  const response = await fetch(
    `${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, returnSecureToken: true }),
    },
  );
  const data = await response.json();
  if (!response.ok) throw new Error(`Auth emulator error: ${JSON.stringify(data)}`);
  return data;
}

export async function createUser({ email = uniqueEmail(), password = "summarist123" } = {}) {
  const data = await authRequest({ email, password });
  return { uid: data.localId, email, password, idToken: data.idToken };
}

export async function createGuestUser() {
  const data = await authRequest({});
  return { uid: data.localId, idToken: data.idToken };
}

export async function openDialog(page, trigger) {
  const dialog = page.getByRole("dialog");
  await expect(async () => {
    await trigger.click();
    await expect(dialog).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15_000 });
  return dialog;
}

export async function loginThroughSidebar(page, { email, password }) {
  const sidebar = page.getByRole("complementary", { name: "Sidebar" });
  await openDialog(page, sidebar.getByRole("button", { name: "Login" }));
  const dialog = page.getByRole("dialog", { name: "Log in to Summarist" });
  await dialog.getByPlaceholder("Email Address").fill(email);
  await dialog.getByPlaceholder("Password").fill(password);
  await dialog.getByRole("button", { name: "Login", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(sidebar.getByRole("button", { name: "Logout" })).toBeVisible();
}

function decodeValue(value) {
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("nullValue" in value) return null;
  if ("timestampValue" in value) return value.timestampValue;
  if ("mapValue" in value) return decodeFields(value.mapValue.fields ?? {});
  if ("arrayValue" in value) return (value.arrayValue.values ?? []).map(decodeValue);
  return undefined;
}

function decodeFields(fields) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
}

function encodeValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  return { stringValue: String(value) };
}

export async function readDocument(path) {
  const response = await fetch(`${FIRESTORE_EMULATOR}/v1/${DOCUMENTS}/${path}`, {
    headers: { Authorization: "Bearer owner" },
  });
  if (response.status === 404) return null;
  const data = await response.json();
  return decodeFields(data.fields ?? {});
}

export async function readDocumentAs(idToken, path) {
  const response = await fetch(`${FIRESTORE_EMULATOR}/v1/${DOCUMENTS}/${path}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  return response.status;
}

export async function writeDocumentAs(idToken, path, fields, { serverTimestamp } = {}) {
  const write = {
    update: {
      name: `${DOCUMENTS}/${path}`,
      fields: Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, encodeValue(value)])),
    },
  };
  if (serverTimestamp) {
    write.updateTransforms = [{ fieldPath: serverTimestamp, setToServerValue: "REQUEST_TIME" }];
  }
  const response = await fetch(`${FIRESTORE_EMULATOR}/v1/${DOCUMENTS}:commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ writes: [write] }),
  });
  return response.status;
}

export function shelfEntry(book) {
  return {
    bookId: book.id,
    title: book.title,
    author: book.author,
    subTitle: book.subTitle,
    imageLink: book.imageLink,
    audioLink: book.audioLink,
    averageRating: book.averageRating,
    subscriptionRequired: book.subscriptionRequired,
  };
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

export function subscriptionEvent({
  uid,
  type = "customer.subscription.created",
  subscriptionId = `sub_${random()}`,
  customerId = `cus_${random()}`,
  status = "trialing",
  plan = "premium-plus",
  created = nowSeconds(),
  cancelAtPeriodEnd = false,
  id = `evt_${random()}`,
}) {
  const interval = plan === "premium" ? "month" : "year";
  const periodEnd = created + (interval === "year" ? 365 : 30) * 86400;
  return {
    id,
    object: "event",
    type,
    created,
    livemode: false,
    api_version: "2026-09-30.endive",
    data: {
      object: {
        id: subscriptionId,
        object: "subscription",
        customer: customerId,
        status,
        livemode: false,
        cancel_at_period_end: cancelAtPeriodEnd,
        cancel_at: cancelAtPeriodEnd ? periodEnd : null,
        canceled_at: status === "canceled" ? created : null,
        ended_at: status === "canceled" ? created : null,
        trial_start: status === "trialing" ? created : null,
        trial_end: status === "trialing" ? created + 7 * 86400 : null,
        metadata: uid ? { firebaseUID: uid, plan } : {},
        items: {
          object: "list",
          data: [
            {
              id: `si_${random()}`,
              object: "subscription_item",
              current_period_start: created,
              current_period_end: periodEnd,
              price: {
                id: PRICES[plan],
                object: "price",
                type: "recurring",
                recurring: { interval, interval_count: 1 },
              },
            },
          ],
        },
      },
    },
  };
}

export function checkoutCompletedEvent({ uid, customerId = `cus_${random()}`, created = nowSeconds() }) {
  return {
    id: `evt_${random()}`,
    object: "event",
    type: "checkout.session.completed",
    created,
    livemode: false,
    data: {
      object: {
        id: `cs_test_${random()}`,
        object: "checkout.session",
        mode: "subscription",
        status: "complete",
        payment_status: "no_payment_required",
        customer: customerId,
        client_reference_id: uid,
        subscription: `sub_${random()}`,
        metadata: { firebaseUID: uid, plan: "premium-plus" },
      },
    },
  };
}

export function invoiceEvent({ uid, subscriptionId, customerId, type = "invoice.paid", created = nowSeconds() }) {
  return {
    id: `evt_${random()}`,
    object: "event",
    type,
    created,
    livemode: false,
    data: {
      object: {
        id: `in_${random()}`,
        object: "invoice",
        customer: customerId,
        status: type === "invoice.paid" ? "paid" : "open",
        amount_paid: type === "invoice.paid" ? 999 : 0,
        currency: "usd",
        parent: {
          type: "subscription_details",
          subscription_details: { subscription: subscriptionId, metadata: { firebaseUID: uid } },
        },
      },
    },
  };
}

export async function sendWebhook(request, event, { secret = WEBHOOK_SECRET, signature } = {}) {
  const payload = JSON.stringify(event);
  const header =
    signature === undefined ? Stripe.webhooks.generateTestHeaderString({ payload, secret }) : signature;
  return request.post("/api/stripe/webhook", {
    data: payload,
    headers: {
      "content-type": "application/json",
      ...(header ? { "stripe-signature": header } : {}),
    },
  });
}

export async function activateSubscription(request, uid, overrides = {}) {
  const event = subscriptionEvent({ uid, ...overrides });
  const response = await sendWebhook(request, event);
  expect(response.status()).toBe(200);
  expect((await response.json()).outcome).toBe("synced");
  return event;
}

export function toSeconds(timestamp) {
  const [minutes, seconds] = timestamp.trim().split(":").map(Number);
  return minutes * 60 + seconds;
}
