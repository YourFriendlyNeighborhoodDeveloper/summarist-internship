import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { ENTITLED_STATUSES, PLANS } from "@/lib/plans";
import { HttpError } from "@/lib/server/http";
import { getPlanForPrice, getPriceId, getStripe } from "@/lib/server/stripe";

const TERMINAL_STATUSES = ["canceled", "incomplete_expired"];
const EVENT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const ALREADY_EXISTS = 6;

const SUBSCRIPTION_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "customer.subscription.trial_will_end",
  "customer.subscription.pending_update_applied",
  "customer.subscription.pending_update_expired",
]);

const CHECKOUT_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

const INVOICE_EVENTS = new Set([
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required",
]);

const idOf = (value) => (typeof value === "string" ? value : value?.id ?? null);
const toMillis = (seconds) => (Number.isFinite(seconds) ? seconds * 1000 : null);

function linkCustomer(writer, db, uid, customerId, extra = {}) {
  writer.set(
    db.collection("customers").doc(uid),
    { stripeCustomerId: customerId, updatedAt: FieldValue.serverTimestamp(), ...extra },
    { merge: true },
  );
  writer.set(
    db.collection("stripeCustomers").doc(customerId),
    { uid, updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
}

async function getOrCreateCustomer({ db, stripe, uid, email }) {
  const snapshot = await db.collection("customers").doc(uid).get();
  const storedId = snapshot.data()?.stripeCustomerId;

  if (storedId) {
    try {
      const customer = await stripe.customers.retrieve(storedId);
      if (!customer.deleted) return customer.id;
    } catch (error) {
      if (error?.code !== "resource_missing") throw error;
    }
  }

  const customer = await stripe.customers.create(
    { email: email || undefined, metadata: { firebaseUID: uid } },
    { idempotencyKey: `summarist-customer-${uid}-${storedId ?? "new"}` },
  );
  const batch = db.batch();
  linkCustomer(batch, db, uid, customer.id, { email: email ?? null });
  await batch.commit();
  return customer.id;
}

export async function createCheckoutSession({ db, uid, email, planId, origin }) {
  const plan = PLANS[planId];
  const priceId = getPriceId(planId);
  if (!priceId) {
    throw new HttpError(503, "This plan isn't available yet. Please try again later.", "price_not_configured");
  }

  const stripe = getStripe();
  const price = await stripe.prices.retrieve(priceId);
  if (!price.active || price.type !== "recurring" || price.recurring?.interval !== plan.interval) {
    throw new HttpError(503, "This plan is misconfigured. Please contact support.", "price_misconfigured");
  }

  const customerId = await getOrCreateCustomer({ db, stripe, uid, email });
  const existing = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 20 });
  if (existing.data.some((subscription) => ENTITLED_STATUSES.includes(subscription.status))) {
    throw new HttpError(409, "You already have an active subscription.", "already_subscribed");
  }

  const metadata = { firebaseUID: uid, plan: planId };
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: uid,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      metadata,
      ...(plan.trialDays ? { trial_period_days: plan.trialDays } : {}),
    },
    metadata,
    success_url: `${origin}/settings?checkout=success`,
    cancel_url: `${origin}/choose-plan?checkout=cancelled`,
  });
  return session.url;
}

export async function createBillingPortalSession({ db, uid, origin }) {
  const snapshot = await db.collection("customers").doc(uid).get();
  const customerId = snapshot.data()?.stripeCustomerId;
  if (!customerId) {
    throw new HttpError(404, "There's no billing account for this user yet.", "no_customer");
  }
  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/settings`,
  });
  return session.url;
}

function eventRecord(event, outcome) {
  return {
    type: event.type,
    created: event.created,
    livemode: Boolean(event.livemode),
    outcome,
    processedAt: FieldValue.serverTimestamp(),
    expireAt: Timestamp.fromMillis(Date.now() + EVENT_RETENTION_MS),
  };
}

async function markEvent(eventRef, event, outcome) {
  try {
    await eventRef.create(eventRecord(event, outcome));
    return outcome;
  } catch (error) {
    if (error?.code === ALREADY_EXISTS) return "duplicate";
    throw error;
  }
}

async function resolveUid(db, customerId, metadataUid) {
  if (customerId) {
    const mapping = await db.collection("stripeCustomers").doc(customerId).get();
    const uid = mapping.data()?.uid;
    if (uid) return uid;
  }
  return typeof metadataUid === "string" && metadataUid ? metadataUid : null;
}

function toSubscriptionRecord(subscription, event) {
  const item = subscription.items?.data?.[0];
  const price = item?.price ?? null;
  return {
    subscriptionId: subscription.id,
    customerId: idOf(subscription.customer),
    status: subscription.status,
    plan: getPlanForPrice(price, subscription.metadata?.plan),
    priceId: idOf(price),
    interval: price?.recurring?.interval ?? null,
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    cancelAt: toMillis(subscription.cancel_at),
    canceledAt: toMillis(subscription.canceled_at),
    endedAt: toMillis(subscription.ended_at),
    trialEnd: toMillis(subscription.trial_end),
    currentPeriodEnd: toMillis(item?.current_period_end ?? subscription.current_period_end),
    livemode: Boolean(subscription.livemode),
    eventCreated: event.created,
    eventId: event.id,
  };
}

function isStale(current, next) {
  if (current.subscriptionId === next.subscriptionId) {
    if (TERMINAL_STATUSES.includes(current.status) && !TERMINAL_STATUSES.includes(next.status)) {
      return true;
    }
    return current.eventCreated > next.eventCreated;
  }
  return ENTITLED_STATUSES.includes(current.status) && !ENTITLED_STATUSES.includes(next.status);
}

async function syncSubscription(db, eventRef, event) {
  const subscription = event.data.object;
  const customerId = idOf(subscription.customer);
  const uid = await resolveUid(db, customerId, subscription.metadata?.firebaseUID);
  if (!uid) return markEvent(eventRef, event, "unmapped");

  const subscriptionRef = db.collection("subscriptions").doc(uid);
  return db.runTransaction(async (transaction) => {
    const [processed, currentSnapshot] = await Promise.all([
      transaction.get(eventRef),
      transaction.get(subscriptionRef),
    ]);
    if (processed.exists) return "duplicate";

    const current = currentSnapshot.data();
    const next = toSubscriptionRecord(subscription, event);
    const outcome = current && isStale(current, next) ? "stale" : "synced";
    if (outcome === "synced") {
      const record = { ...next, updatedAt: FieldValue.serverTimestamp() };
      if (current?.subscriptionId !== next.subscriptionId) record.latestInvoice = null;
      transaction.set(subscriptionRef, record, { merge: true });
      if (customerId) linkCustomer(transaction, db, uid, customerId);
    }
    transaction.set(eventRef, eventRecord(event, outcome));
    return outcome;
  });
}

async function recordCheckout(db, eventRef, event) {
  const session = event.data.object;
  if (session.mode !== "subscription") return markEvent(eventRef, event, "ignored");

  const customerId = idOf(session.customer);
  const uid = session.client_reference_id || session.metadata?.firebaseUID;
  if (!uid || !customerId) return markEvent(eventRef, event, "unmapped");

  return db.runTransaction(async (transaction) => {
    const processed = await transaction.get(eventRef);
    if (processed.exists) return "duplicate";
    linkCustomer(transaction, db, uid, customerId, { lastCheckoutSessionId: session.id });
    transaction.set(eventRef, eventRecord(event, "linked"));
    return "linked";
  });
}

async function recordInvoice(db, eventRef, event) {
  const invoice = event.data.object;
  const details = invoice.parent?.subscription_details;
  const subscriptionId = idOf(details?.subscription) ?? idOf(invoice.subscription);
  const uid = await resolveUid(db, idOf(invoice.customer), details?.metadata?.firebaseUID);
  if (!uid || !subscriptionId) return markEvent(eventRef, event, "ignored");

  const subscriptionRef = db.collection("subscriptions").doc(uid);
  return db.runTransaction(async (transaction) => {
    const [processed, currentSnapshot] = await Promise.all([
      transaction.get(eventRef),
      transaction.get(subscriptionRef),
    ]);
    if (processed.exists) return "duplicate";

    const current = currentSnapshot.data();
    const applies =
      current?.subscriptionId === subscriptionId &&
      !(current.latestInvoice?.eventCreated > event.created);
    if (applies) {
      transaction.set(
        subscriptionRef,
        {
          latestInvoice: {
            id: invoice.id,
            status: invoice.status ?? null,
            paid: event.type === "invoice.paid",
            amountPaid: invoice.amount_paid ?? 0,
            currency: invoice.currency ?? null,
            eventCreated: event.created,
          },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
    const outcome = applies ? "recorded" : "ignored";
    transaction.set(eventRef, eventRecord(event, outcome));
    return outcome;
  });
}

export async function handleStripeEvent(db, event) {
  const eventRef = db.collection("stripeEvents").doc(event.id);
  if (CHECKOUT_EVENTS.has(event.type)) return recordCheckout(db, eventRef, event);
  if (SUBSCRIPTION_EVENTS.has(event.type)) return syncSubscription(db, eventRef, event);
  if (INVOICE_EVENTS.has(event.type)) return recordInvoice(db, eventRef, event);
  return "ignored";
}
