import { createBillingPortalSession } from "@/lib/server/billing";
import { getAdmin } from "@/lib/server/firebase-admin";
import {
  errorResponse,
  getAppOrigin,
  requireRegisteredUser,
  requireUser,
} from "@/lib/server/http";

export async function POST(request) {
  try {
    const { auth, db } = getAdmin();
    const user = requireRegisteredUser(await requireUser(request, auth));
    const url = await createBillingPortalSession({
      db,
      uid: user.uid,
      origin: getAppOrigin(request),
    });
    return Response.json({ url });
  } catch (error) {
    return errorResponse(error);
  }
}
