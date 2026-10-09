import "server-only";
import Stripe from "stripe";
import { PLANS, isPaidPlan } from "@/lib/plans";
import { HttpError } from "@/lib/server/http";

const PRICE_ENV = {
  premium: "STRIPE_PRICE_PREMIUM_MONTHLY",
  "premium-plus": "STRIPE_PRICE_PREMIUM_PLUS_YEARLY",
};

let client = null;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new HttpError(503, "Payments aren't configured yet. Please try again later.", "stripe_not_configured");
  }
  if (key.includes("_live_") && process.env.STRIPE_ALLOW_LIVE_MODE !== "true") {
    throw new HttpError(
      503,
      "Live Stripe keys are disabled. Use test mode keys or set STRIPE_ALLOW_LIVE_MODE=true.",
      "stripe_live_mode_disabled",
    );
  }
  client ??= new Stripe(key, { appInfo: { name: "Summarist" } });
  return client;
}

export function getWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new HttpError(503, "The Stripe webhook secret isn't configured.", "stripe_webhook_not_configured");
  }
  return secret;
}

export function getPriceId(planId) {
  if (!isPaidPlan(planId)) return null;
  return process.env[PRICE_ENV[planId]]?.trim() || null;
}

export function getPlanForPrice(price, metadataPlan) {
  const priceId = typeof price === "string" ? price : price?.id;
  const match = Object.keys(PRICE_ENV).find((planId) => priceId && getPriceId(planId) === priceId);
  if (match) return match;
  if (isPaidPlan(metadataPlan)) return metadataPlan;
  const interval = typeof price === "object" ? price?.recurring?.interval : null;
  return Object.values(PLANS).find((plan) => isPaidPlan(plan.id) && plan.interval === interval)?.id ?? null;
}
