"use client";

import { useEffect } from "react";

/** Re-run data loaders when the user returns to this tab (e.g. after admin changes). */
export function useRefetchOnWindowFocus(callback: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const run = () => {
      callback();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") run();
    };

    window.addEventListener("focus", run);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", run);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [callback, enabled]);
}
