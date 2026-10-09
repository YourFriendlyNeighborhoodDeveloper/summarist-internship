"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import styles from "./PremiumPill.module.css";

export default function PremiumPill({ subscriptionRequired, className = "" }) {
  const { isSubscribed, subscriptionLoading } = useAuth();
  if (!subscriptionRequired || subscriptionLoading || isSubscribed) return null;

  return <span className={`${styles.pill} ${className}`.trim()}>Premium</span>;
}
