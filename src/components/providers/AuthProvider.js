"use client";

import { onIdTokenChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getFirebase, isFirebaseConfigured } from "@/lib/firebase/client";
import { getPlanId, isSubscriptionActive } from "@/lib/plans";

const AuthContext = createContext(null);

function toAccount(user) {
  if (!user) return null;
  return { uid: user.uid, email: user.email, isAnonymous: user.isAnonymous };
}

export default function AuthProvider({ children }) {
  const [authState, setAuthState] = useState({
    user: null,
    account: null,
    initializing: isFirebaseConfigured,
  });
  const [billing, setBilling] = useState({ key: null, subscription: null, error: null });
  const [billingAttempt, setBillingAttempt] = useState(0);

  useEffect(() => {
    const firebase = getFirebase();
    if (!firebase) return undefined;
    return onIdTokenChanged(firebase.auth, (user) => {
      setAuthState({ user, account: toAccount(user), initializing: false });
    });
  }, []);

  const billingUid =
    authState.account && !authState.account.isAnonymous ? authState.account.uid : null;
  const billingKey = billingUid ? `${billingUid}:${billingAttempt}` : null;

  useEffect(() => {
    if (!billingUid) return undefined;
    const key = `${billingUid}:${billingAttempt}`;
    const { db } = getFirebase();
    return onSnapshot(
      doc(db, "subscriptions", billingUid),
      (snapshot) =>
        setBilling({
          key,
          subscription: snapshot.exists() ? snapshot.data() : null,
          error: null,
        }),
      (error) => setBilling({ key, subscription: null, error }),
    );
  }, [billingUid, billingAttempt]);

  const retrySubscription = useCallback(() => setBillingAttempt((attempt) => attempt + 1), []);

  const value = useMemo(() => {
    const billingSettled = !billingKey || billing.key === billingKey;
    const subscription = billingKey && billing.key === billingKey ? billing.subscription : null;
    return {
      user: authState.user,
      account: authState.account,
      initializing: authState.initializing,
      isConfigured: isFirebaseConfigured,
      subscription,
      subscriptionLoading: authState.initializing || !billingSettled,
      subscriptionError: billingKey && billing.key === billingKey ? billing.error : null,
      retrySubscription,
      isSubscribed: isSubscriptionActive(subscription),
      planId: getPlanId(subscription),
    };
  }, [authState, billing, billingKey, retrySubscription]);

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider.");
  return context;
}
