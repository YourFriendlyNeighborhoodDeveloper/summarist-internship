import "server-only";

export class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

export function errorResponse(error) {
  if (error instanceof HttpError) {
    return Response.json({ error: error.message, code: error.code }, { status: error.status });
  }
  console.error(error);
  if (typeof error?.type === "string" && error.type.startsWith("Stripe")) {
    return Response.json(
      { error: "The payment provider couldn't complete the request. Please try again.", code: "stripe_error" },
      { status: 502 },
    );
  }
  return Response.json(
    { error: "Something went wrong on our side. Please try again.", code: "internal" },
    { status: 500 },
  );
}

export async function requireUser(request, auth) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) throw new HttpError(401, "Please log in to continue.", "unauthenticated");

  try {
    return await auth.verifyIdToken(token);
  } catch {
    throw new HttpError(401, "Your session has expired. Please log in again.", "unauthenticated");
  }
}

export function requireRegisteredUser(decodedToken) {
  if (decodedToken.firebase?.sign_in_provider === "anonymous") {
    throw new HttpError(
      403,
      "Guest accounts can't subscribe. Create an account to continue.",
      "guest_account",
    );
  }
  return decodedToken;
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "The request body must be valid JSON.", "invalid_json");
  }
}

export function getAppOrigin(request) {
  const configured = process.env.APP_URL?.trim();
  if (configured) return new URL(configured).origin;
  return new URL(request.url).origin;
}
