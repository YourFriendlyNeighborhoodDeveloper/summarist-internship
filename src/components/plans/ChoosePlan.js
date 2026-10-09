"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, Suspense, useEffect, useState } from "react";
import { AiFillFileText } from "react-icons/ai";
import { FaHandshake } from "react-icons/fa";
import { RiPlantFill } from "react-icons/ri";
import { useDispatch } from "react-redux";
import pricingImage from "@/assets/pricing-top.png";
import Footer from "@/components/layout/Footer";
import FaqAccordion from "@/components/plans/FaqAccordion";
import { useAuth } from "@/components/providers/AuthProvider";
import Spinner from "@/components/ui/Spinner";
import { startCheckout } from "@/lib/billing";
import { PLANS, PLAN_ORDER } from "@/lib/plans";
import { openAuthModal } from "@/store/uiSlice";
import styles from "./ChoosePlan.module.css";

function CancelledNotice() {
  const searchParams = useSearchParams();
  if (searchParams.get("checkout") !== "cancelled") return null;
  return (
    <p className={styles.notice} role="status">
      Checkout was canceled, so you haven&apos;t been charged. Pick a plan whenever you&apos;re ready.
    </p>
  );
}

function PlanOption({ plan, checked, onSelect }) {
  return (
    <label className={`${styles.card} ${checked ? styles.cardActive : ""}`.trim()}>
      <input
        type="radio"
        name="plan"
        value={plan.id}
        checked={checked}
        onChange={() => onSelect(plan.id)}
        className="visually-hidden"
      />
      <span className={styles.circle} aria-hidden="true">
        {checked && <span className={styles.dot} />}
      </span>
      <span>
        <span className={styles.cardTitle}>{plan.name}</span>
        <span className={styles.cardPrice}>{plan.price}</span>
        <span className={styles.cardText}>{plan.note}</span>
      </span>
    </label>
  );
}

export default function ChoosePlan() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { account, isSubscribed, planId: currentPlanId } = useAuth();
  const [selected, setSelected] = useState("premium-plus");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const plan = PLANS[selected];

  useEffect(() => {
    const handlePageShow = (event) => {
      if (event.persisted) setPending(false);
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  async function handleContinue() {
    setError(null);
    if (selected === "basic") {
      if (account) router.push("/for-you");
      else dispatch(openAuthModal({ view: "register", message: "Create a free account to start reading." }));
      return;
    }
    if (!account) {
      dispatch(openAuthModal({ message: "Log in or sign up to start your subscription." }));
      return;
    }
    if (account.isAnonymous) {
      dispatch(
        openAuthModal({
          view: "register",
          message: "Guest accounts can't subscribe. Sign up to keep your library and continue.",
        }),
      );
      return;
    }

    setPending(true);
    try {
      const url = await startCheckout(selected);
      window.location.assign(url);
    } catch (caught) {
      setError(caught.message);
      setPending(false);
    }
  }

  return (
    <div className={styles.plan}>
      <div className={styles.headerWrapper}>
        <div className={styles.header}>
          <h1 className={styles.title}>Get unlimited access to many amazing books to read</h1>
          <p className={styles.subTitle}>Turn ordinary moments into amazing learning opportunities</p>
          <figure className={styles.imageMask}>
            <Image src={pricingImage} alt="" priority sizes="340px" />
          </figure>
        </div>
      </div>

      <div className="row">
        <div className="container">
          <ul className={styles.features}>
            <li className={styles.feature}>
              <AiFillFileText aria-hidden="true" className={styles.featureIcon} />
              <p className={styles.featureText}>
                <b>Key ideas in few min</b> with many books to read
              </p>
            </li>
            <li className={styles.feature}>
              <RiPlantFill aria-hidden="true" className={styles.featureIcon} />
              <p className={styles.featureText}>
                <b>3 million</b> people growing with Summarist everyday
              </p>
            </li>
            <li className={styles.feature}>
              <FaHandshake aria-hidden="true" className={styles.featureIcon} />
              <p className={styles.featureText}>
                <b>Precise recommendations</b> collections curated by experts
              </p>
            </li>
          </ul>

          <h2 id="plans-title" className="section-title">
            Choose the plan that fits you
          </h2>

          <Suspense fallback={null}>
            <CancelledNotice />
          </Suspense>

          {isSubscribed && (
            <p className={styles.notice} role="status">
              You&apos;re already on <b>{PLANS[currentPlanId].label}</b>. You can manage your
              subscription from <Link href="/settings">Settings</Link>.
            </p>
          )}

          <div role="radiogroup" aria-labelledby="plans-title" className={styles.options}>
            {PLAN_ORDER.map((id, index) => (
              <Fragment key={id}>
                {index > 0 && (
                  <div className={styles.separator} aria-hidden="true">
                    or
                  </div>
                )}
                <PlanOption plan={PLANS[id]} checked={selected === id} onSelect={setSelected} />
              </Fragment>
            ))}
          </div>

          <div className={styles.cta}>
            <button
              type="button"
              className={`btn ${styles.ctaButton}`}
              onClick={handleContinue}
              disabled={pending || (isSubscribed && selected !== "basic")}
            >
              {pending ? <Spinner label="Redirecting to secure checkout" /> : plan.cta}
            </button>
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
            <p className={styles.disclaimer}>{plan.disclaimer}</p>
          </div>

          <FaqAccordion />
        </div>
      </div>

      <Footer />
    </div>
  );
}
