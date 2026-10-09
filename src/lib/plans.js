export const PLANS = {
  "premium-plus": {
    id: "premium-plus",
    name: "Premium Plus Yearly",
    label: "Premium Plus",
    price: "$99.99/year",
    interval: "year",
    trialDays: 7,
    note: "7-day free trial included",
    cta: "Start your free 7-day trial",
    disclaimer: "Cancel your trial at any time before it ends, and you won’t be charged.",
  },
  premium: {
    id: "premium",
    name: "Premium Monthly",
    label: "Premium",
    price: "$9.99/month",
    interval: "month",
    trialDays: 0,
    note: "No trial included",
    cta: "Start your first month",
    disclaimer: "30-day money back guarantee, no questions asked.",
  },
  basic: {
    id: "basic",
    name: "Basic",
    label: "Basic",
    price: "Free",
    interval: null,
    trialDays: 0,
    note: "Unlimited access to every free title",
    cta: "Continue with Basic",
    disclaimer: "No payment details required. Upgrade whenever you like.",
  },
};

export const PAID_PLAN_IDS = ["premium-plus", "premium"];

export const PLAN_ORDER = ["premium-plus", "premium", "basic"];

export function isPaidPlan(planId) {
  return PAID_PLAN_IDS.includes(planId);
}

export const ENTITLED_STATUSES = ["active", "trialing"];

export function isSubscriptionActive(subscription) {
  return Boolean(subscription && ENTITLED_STATUSES.includes(subscription.status));
}

export function getPlanId(subscription) {
  if (!isSubscriptionActive(subscription)) return "basic";
  return isPaidPlan(subscription.plan) ? subscription.plan : "premium";
}
