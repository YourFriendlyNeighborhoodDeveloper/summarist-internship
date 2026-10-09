"use client";

import { useEffect } from "react";
import ErrorState from "@/components/ui/ErrorState";

export default function AppError({ error, retry }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="row">
      <div className="container">
        <ErrorState
          title="Something went wrong"
          message="This page ran into a problem. Please try again."
          onRetry={retry}
        />
      </div>
    </div>
  );
}
