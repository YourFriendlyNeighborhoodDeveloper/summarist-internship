import {
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  linkWithCredential,
  linkWithPopup,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { getFirebase } from "@/lib/firebase/client";

export const MIN_PASSWORD_LENGTH = 6;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class AuthInputError extends Error {
  constructor(message, field) {
    super(message);
    this.name = "AuthInputError";
    this.field = field;
  }
}

const NOT_CONFIGURED_MESSAGE =
  "Login is unavailable because Firebase isn't configured for this deployment.";

function requireAuth() {
  const firebase = getFirebase();
  if (!firebase) throw new AuthInputError(NOT_CONFIGURED_MESSAGE);
  return firebase.auth;
}

export function validateEmail(email) {
  const value = email.trim();
  if (!value) throw new AuthInputError("Please enter your email address.", "email");
  if (!EMAIL_PATTERN.test(value)) throw new AuthInputError("Please enter a valid email address.", "email");
  return value;
}

function validatePassword(password, { isNew = false } = {}) {
  if (!password) throw new AuthInputError("Please enter your password.", "password");
  if (isNew && password.length < MIN_PASSWORD_LENGTH) {
    throw new AuthInputError(
      `Your password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      "password",
    );
  }
  return password;
}

export async function loginWithEmail(email, password) {
  const auth = requireAuth();
  const credential = await signInWithEmailAndPassword(
    auth,
    validateEmail(email),
    validatePassword(password),
  );
  return credential.user;
}

export async function registerWithEmail(email, password) {
  const auth = requireAuth();
  const address = validateEmail(email);
  const secret = validatePassword(password, { isNew: true });
  const current = auth.currentUser;

  if (current?.isAnonymous) {
    const credential = await linkWithCredential(
      current,
      EmailAuthProvider.credential(address, secret),
    );
    return credential.user;
  }
  const credential = await createUserWithEmailAndPassword(auth, address, secret);
  return credential.user;
}

export async function loginAsGuest() {
  const auth = requireAuth();
  const credential = await signInAnonymously(auth);
  return credential.user;
}

export async function loginWithGoogle() {
  const auth = requireAuth();
  const provider = new GoogleAuthProvider();
  const current = auth.currentUser;

  if (current?.isAnonymous) {
    try {
      const credential = await linkWithPopup(current, provider);
      return credential.user;
    } catch (error) {
      const existing = GoogleAuthProvider.credentialFromError(error);
      if (error?.code === "auth/credential-already-in-use" && existing) {
        const credential = await signInWithCredential(auth, existing);
        return credential.user;
      }
      throw error;
    }
  }
  const credential = await signInWithPopup(auth, provider);
  return credential.user;
}

export async function requestPasswordReset(email) {
  const auth = requireAuth();
  await sendPasswordResetEmail(auth, validateEmail(email));
}

export async function logout() {
  const firebase = getFirebase();
  if (firebase) await signOut(firebase.auth);
}

export async function getIdToken() {
  const user = getFirebase()?.auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

const FIREBASE_MESSAGES = {
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/missing-email": "Please enter your email address.",
  "auth/missing-password": "Please enter your password.",
  "auth/weak-password": `Your password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
  "auth/email-already-in-use": "An account with this email already exists. Try logging in instead.",
  "auth/credential-already-in-use": "That account is already linked to another user.",
  "auth/user-not-found": "No account was found with this email. Check the address or sign up.",
  "auth/wrong-password": "The password is incorrect. Please try again.",
  "auth/invalid-credential": "The email or password is incorrect.",
  "auth/invalid-login-credentials": "The email or password is incorrect.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/network-request-failed": "Network error. Check your connection and try again.",
  "auth/popup-blocked": "Your browser blocked the Google sign-in window. Allow pop-ups and try again.",
  "auth/popup-closed-by-user": "The Google sign-in window was closed before finishing.",
  "auth/cancelled-popup-request": "The Google sign-in window was closed before finishing.",
  "auth/operation-not-allowed": "This sign-in method isn't enabled for this project yet.",
  "auth/admin-restricted-operation": "Guest login isn't enabled for this project yet.",
  "auth/unauthorized-domain": "This domain isn't authorized for sign-in. Add it in the Firebase console.",
  "auth/invalid-api-key": NOT_CONFIGURED_MESSAGE,
  "auth/api-key-not-valid": NOT_CONFIGURED_MESSAGE,
  "auth/configuration-not-found": "This sign-in method isn't enabled for this project yet.",
};

export function getAuthErrorMessage(error) {
  if (error instanceof AuthInputError) return error.message;
  const code = typeof error?.code === "string" ? error.code : "";
  if (FIREBASE_MESSAGES[code]) return FIREBASE_MESSAGES[code];
  if (code.startsWith("auth/api-key-not-valid")) return NOT_CONFIGURED_MESSAGE;
  return "Something went wrong. Please try again.";
}
