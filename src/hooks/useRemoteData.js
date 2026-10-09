"use client";

import { useCallback, useEffect, useEffectEvent, useState } from "react";
import { isAbortError } from "@/lib/books";

export default function useRemoteData(key, load) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ token: null, data: undefined, error: null });
  const token = key == null ? null : `${key}#${attempt}`;
  const runLoad = useEffectEvent((signal) => load(signal));

  useEffect(() => {
    if (token == null) return undefined;
    const controller = new AbortController();
    runLoad(controller.signal).then(
      (data) => setResult({ token, data, error: null }),
      (error) => {
        if (!controller.signal.aborted && !isAbortError(error)) {
          setResult({ token, data: undefined, error });
        }
      },
    );
    return () => controller.abort();
  }, [token]);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);
  const settled = token != null && result.token === token;

  return {
    data: settled ? result.data : undefined,
    error: settled ? result.error : null,
    loading: token != null && !settled,
    retry,
  };
}
