import Stripe from "stripe";
import { handleStripeEvent } from "@/lib/server/billing";
import { getAdmin } from "@/lib/server/firebase-admin";
import { HttpError, errorResponse } from "@/lib/server/http";
import { getWebhookSecret } from "@/lib/server/stripe";

export async function POST(request) {
  try {
    const secret = getWebhookSecret();
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      throw new HttpError(400, "Missing Stripe signature.", "missing_signature");
    }

    const payload = await request.text();
    let event;
    try {
      event = Stripe.webhooks.constructEvent(payload, signature, secret);
    } catch {
      throw new HttpError(400, "Invalid Stripe signature.", "invalid_signature");
    }

    const { db } = getAdmin();
    const outcome = await handleStripeEvent(db, event);
    return Response.json({ received: true, outcome });
  } catch (error) {
    return errorResponse(error);
  }
}
