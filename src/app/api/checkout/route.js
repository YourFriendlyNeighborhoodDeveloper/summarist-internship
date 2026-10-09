import { isPaidPlan, isSubscriptionActive } from "@/lib/plans";
import { createCheckoutSession } from "@/lib/server/billing";
import { getAdmin } from "@/lib/server/firebase-admin";
import {
  HttpError,
  errorResponse,
  getAppOrigin,
  readJson,
  requireRegisteredUser,
  requireUser,
} from "@/lib/server/http";

export async function POST(request) {
  try {
    const { auth, db } = getAdmin();
    const user = requireRegisteredUser(await requireUser(request, auth));

    const body = await readJson(request);
    const planId = body?.plan;
    if (!isPaidPlan(planId)) {
      throw new HttpError(400, "Please choose a valid plan.", "invalid_plan");
    }

    const current = await db.collection("subscriptions").doc(user.uid).get();
    if (isSubscriptionActive(current.data())) {
      throw new HttpError(409, "You already have an active subscription.", "already_subscribed");
    }

    const url = await createCheckoutSession({
      db,
      uid: user.uid,
      email: user.email,
      planId,
      origin: getAppOrigin(request),
    });
    return Response.json({ url });
  } catch (error) {
    return errorResponse(error);
  }
}
