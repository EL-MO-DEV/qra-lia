"use client";

import { useEffect, useState } from "react";
import { useLang, type StringKey } from "@/lib/i18n";

type LoadingProps = {
  previewUrl?: string | null;
};

const STEPS: { at: number; label: StringKey; icon: string }[] = [
  { at: 0, label: "stepSend", icon: "📤" },
  { at: 2500, label: "stepRead", icon: "🔎" },
  { at: 6000, label: "stepExplain", icon: "🗣️" },
];

/**
 * Calm loading screen: the photo with a scanning line + three progress steps.
 * After 8s we add a "hang on, almost there" line so it never feels stuck.
 */
export default function Loading({ previewUrl }: LoadingProps) {
  const [elapsed, setElapsed] = useState(0);
  const { t } = useLang();

  useEffect(() => {
    const started = Date.now();
    const t = setInterval(() => setElapsed(Date.now() - started), 500);
    return () => clearInterval(t);
  }, []);

  const active = STEPS.reduce((acc, s, i) => (elapsed >= s.at ? i : acc), 0);

  return (
    <div className="loading" role="status" aria-live="polite">
      <div className="scan-frame">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- local object URL, nothing to optimize
          <img src={previewUrl} alt="" aria-hidden="true" />
        ) : (
          <span aria-hidden="true">📄</span>
        )}
        <span className="scan-line" aria-hidden="true" />
        <span className="scan-corners" aria-hidden="true" />
      </div>

      <p className="loading-title">
        {t("reading")}
        <span className="fr" lang="fr">
          Lecture en cours…
        </span>
      </p>

      <ol className="loading-steps">
        {STEPS.map((s, i) => (
          <li key={s.label} className={i < active ? "is-done" : i === active ? "is-active" : undefined}>
            <span aria-hidden="true">{i < active ? "✅" : s.icon}</span>
            {t(s.label)}
          </li>
        ))}
      </ol>

      {elapsed >= 8000 && (
        <p className="loading-patience">
          {t("patience")}
          <span className="fr" lang="fr">
            Encore quelques secondes
          </span>
        </p>
      )}
    </div>
  );
}
