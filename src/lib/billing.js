import { getIdToken } from "@/lib/auth";

export class BillingError extends Error {
  constructor(message, { status = 0, code = null } = {}) {
    super(message);
    this.name = "BillingError";
    this.status = status;
    this.code = code;
  }
}

async function requestRedirect(path, body) {
  const token = await getIdToken();
  if (!token) throw new BillingError("Please log in to continue.", { status: 401 });

  let response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body ?? {}),
    });
  } catch {
    throw new BillingError("We couldn't reach the server. Check your connection and try again.");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.url !== "string") {
    throw new BillingError(data.error || "Something went wrong. Please try again.", {
      status: response.status,
      code: data.code ?? null,
    });
  }
  return data.url;
}

export function startCheckout(planId) {
  return requestRedirect("/api/checkout", { plan: planId });
}

export function openBillingPortal() {
  return requestRedirect("/api/billing-portal");
}
