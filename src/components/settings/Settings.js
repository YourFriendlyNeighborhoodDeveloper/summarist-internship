"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useDispatch } from "react-redux";
import { useAuth } from "@/components/providers/AuthProvider";
import ErrorState from "@/components/ui/ErrorState";
import LoginPrompt from "@/components/ui/LoginPrompt";
import Skeleton from "@/components/ui/Skeleton";
import Spinner from "@/components/ui/Spinner";
import { logout } from "@/lib/auth";
import { openBillingPortal } from "@/lib/billing";
import { formatDate } from "@/lib/format";
import { PLANS } from "@/lib/plans";
import { showToast } from "@/store/toastSlice";
import { openAuthModal } from "@/store/uiSlice";
import styles from "./Settings.module.css";

const PAYMENT_ISSUE_STATUSES = ["past_due", "unpaid", "incomplete"];

function describeSubscription(subscription) {
  if (!subscription) return null;
  const { status, trialEnd, currentPeriodEnd, cancelAtPeriodEnd, cancelAt } = subscription;
  if (status === "trialing") {
    return cancelAtPeriodEnd
      ? `Your free trial ends on ${formatDate(trialEnd)} and won't renew.`
      : `Your free trial ends on ${formatDate(trialEnd)}.`;
  }
  if (status === "active") {
    if (cancelAtPeriodEnd || cancelAt) {
      return `Your plan is canceled and ends on ${formatDate(cancelAt ?? currentPeriodEnd)}.`;
    }
    return currentPeriodEnd ? `Renews on ${formatDate(currentPeriodEnd)}.` : null;
  }
  if (PAYMENT_ISSUE_STATUSES.includes(status)) {
    return "Your last payment didn't go through. Update your payment method to restore Premium.";
  }
  return null;
}

function CheckoutNotice({ isSubscribed }) {
  const searchParams = useSearchParams();
  if (searchParams.get("checkout") !== "success") return null;

  return (
    <div className={styles.notice} role="status">
      {isSubscribed ? (
        "Your subscription is active. Enjoy unlimited access!"
      ) : (
        <>
          <Spinner size={18} label="Confirming payment" />
          Thanks! We&apos;re confirming your payment with Stripe. Your plan will update here
          automatically.
        </>
      )}
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div role="status" aria-label="Loading your settings">
      <Skeleton width={160} height={24} marginBottom={12} />
      <Skeleton width={280} height={24} marginBottom={32} />
      <Skeleton width={160} height={24} marginBottom={12} />
      <Skeleton width={280} height={24} />
    </div>
  );
}

export default function Settings() {
  const dispatch = useDispatch();
  const {
    account,
    initializing,
    subscription,
    subscriptionLoading,
    subscriptionError,
    retrySubscription,
    isSubscribed,
    planId,
  } = useAuth();
  const [opening, setOpening] = useState(false);

  async function manageBilling() {
    setOpening(true);
    try {
      window.location.assign(await openBillingPortal());
    } catch (error) {
      dispatch(showToast({ message: error.message, tone: "error" }));
      setOpening(false);
    }
  }

  async function handleLogout() {
    try {
      await logout();
      dispatch(showToast({ message: "You have logged out successfully." }));
    } catch {
      dispatch(showToast({ message: "We couldn't log you out. Please try again.", tone: "error" }));
    }
  }

  const signUp = () =>
    dispatch(
      openAuthModal({
        view: "register",
        message: "Sign up to keep your library and unlock subscriptions.",
      }),
    );

  const statusLine = describeSubscription(subscription);
  const hasPaymentIssue = PAYMENT_ISSUE_STATUSES.includes(subscription?.status);

  return (
    <div className="container">
      <div className="row">
        <h1 className={`section-title ${styles.pageTitle}`}>Settings</h1>
        {initializing ? (
          <SettingsSkeleton />
        ) : !account ? (
          <LoginPrompt text="Log in to your account to see your details." />
        ) : (
          <>
            <Suspense fallback={null}>
              <CheckoutNotice isSubscribed={isSubscribed} />
            </Suspense>

            <section className={styles.content} aria-labelledby="plan-heading">
              <h2 id="plan-heading" className={styles.subTitle}>
                Your Subscription plan
              </h2>
              {subscriptionLoading ? (
                <Skeleton width={220} height={24} />
              ) : subscriptionError ? (
                <ErrorState
                  compact
                  title="We couldn't load your subscription"
                  message="Please check your connection and try again."
                  onRetry={retrySubscription}
                />
              ) : (
                <>
                  <p className={styles.text} data-testid="plan-name">
                    {PLANS[planId].label}
                  </p>
                  {statusLine && <p className={styles.meta}>{statusLine}</p>}
                  {account.isAnonymous ? (
                    <button type="button" className={`btn ${styles.fitButton}`} onClick={signUp}>
                      Sign up to upgrade
                    </button>
                  ) : isSubscribed || hasPaymentIssue ? (
                    <button
                      type="button"
                      className={`btn ${styles.fitButton}`}
                      onClick={manageBilling}
                      disabled={opening}
                    >
                      {opening ? <Spinner label="Opening billing portal" /> : "Manage subscription"}
                    </button>
                  ) : (
                    <Link href="/choose-plan" className={`btn ${styles.fitButton}`}>
                      Upgrade to Premium
                    </Link>
                  )}
                </>
              )}
            </section>

            <section className={styles.content} aria-labelledby="email-heading">
              <h2 id="email-heading" className={styles.subTitle}>
                Email
              </h2>
              {account.isAnonymous ? (
                <>
                  <p className={styles.text}>Guest account</p>
                  <p className={styles.meta}>
                    Guest data is temporary and is lost when you log out. Sign up to keep it.
                  </p>
                </>
              ) : (
                <p className={styles.text}>{account.email}</p>
              )}
            </section>

            <section className={styles.content} aria-labelledby="account-heading">
              <h2 id="account-heading" className={styles.subTitle}>
                Account
              </h2>
              <button type="button" className={`btn ${styles.fitButton} ${styles.logout}`} onClick={handleLogout}>
                Log out
              </button>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
