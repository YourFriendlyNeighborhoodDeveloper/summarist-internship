"use client";

import { useAuth } from "@/components/providers/AuthProvider";

export default function useBookAccess(book) {
  const { account, initializing, isSubscribed, subscriptionLoading } = useAuth();

  if (!book || initializing) return "checking";
  if (!account) return "login";
  if (!book.subscriptionRequired) return "granted";
  if (subscriptionLoading) return "checking";
  return isSubscribed ? "granted" : "upgrade";
}
