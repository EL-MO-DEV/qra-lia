"use client";

import { useEffect } from "react";

/** Registers /sw.js (offline page + installable PWA). Production builds only. */
export default function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Not fatal: the app works the same without it.
    });
  }, []);
  return null;
}
