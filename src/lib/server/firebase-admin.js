import "server-only";
import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { HttpError } from "@/lib/server/http";

function usingEmulators() {
  return Boolean(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST);
}

function initialize() {
  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (usingEmulators()) {
    return initializeApp({ projectId });
  }

  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new HttpError(
      503,
      "The server isn't connected to Firebase yet. Add the Firebase Admin credentials.",
      "firebase_admin_not_configured",
    );
  }
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
}

export function getAdmin() {
  const app = getApps().length ? getApp() : initialize();
  return { auth: getAuth(app), db: getFirestore(app) };
}
