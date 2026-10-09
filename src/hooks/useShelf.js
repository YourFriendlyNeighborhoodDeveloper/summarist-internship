"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { watchShelf, watchShelfEntry } from "@/lib/library";

export function useShelf(shelf) {
  const { account, initializing } = useAuth();
  const uid = account?.uid ?? null;
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ key: null, books: [], error: null });

  useEffect(() => {
    if (!uid) return undefined;
    const key = `${uid}:${shelf}:${attempt}`;
    return watchShelf(
      uid,
      shelf,
      (books) => setState({ key, books, error: null }),
      (error) => setState({ key, books: [], error }),
    );
  }, [uid, shelf, attempt]);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);
  const key = uid ? `${uid}:${shelf}:${attempt}` : null;
  const settled = key !== null && state.key === key;

  return {
    books: settled ? state.books : [],
    error: settled ? state.error : null,
    loading: initializing || (key !== null && !settled),
    retry,
  };
}

export function useShelfEntry(shelf, bookId) {
  const { account, initializing } = useAuth();
  const uid = account?.uid ?? null;
  const [state, setState] = useState({ key: null, exists: false });

  useEffect(() => {
    if (!uid || !bookId) return undefined;
    const key = `${uid}:${shelf}:${bookId}`;
    return watchShelfEntry(
      uid,
      shelf,
      bookId,
      (exists) => setState({ key, exists }),
      () => setState({ key, exists: false }),
    );
  }, [uid, shelf, bookId]);

  const key = uid && bookId ? `${uid}:${shelf}:${bookId}` : null;
  const settled = key !== null && state.key === key;

  return {
    exists: settled ? state.exists : false,
    loading: initializing || (key !== null && !settled),
  };
}
