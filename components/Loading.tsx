"use client";

import { useEffect, useState } from "react";

type LoadingProps = {
  previewUrl?: string | null;
};

/**
 * Calm loading screen shown while we compress + upload + wait for the AI.
 * After 8s we add a "hang on, almost there" line so it never feels stuck.
 */
export default function Loading({ previewUrl }: LoadingProps) {
  const [showPatience, setShowPatience] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowPatience(true), 8000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="screen loading-screen" role="status" aria-live="polite">
      {previewUrl && (
        <img
          src={previewUrl}
          alt=""
          className="loading-thumbnail"
          aria-hidden="true"
        />
      )}

      <div className="spinner" aria-hidden="true" />

      <p className="loading-text" dir="rtl">
        كنقرا الورقة…
        <span className="loading-text-sub" dir="ltr">
          Lecture en cours…
        </span>
      </p>

      {showPatience && (
        <p className="loading-patience" dir="rtl">
          شوية صبر، قريب نساليو
          <span className="loading-text-sub" dir="ltr">
            Encore quelques secondes
          </span>
        </p>
      )}
    </div>
  );
}
