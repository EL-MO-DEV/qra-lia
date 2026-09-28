"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, FileText, Loader2, MessageCircleMore, ScanSearch, Upload, type LucideIcon } from "lucide-react";
import { useLang, type StringKey } from "@/lib/i18n";

type LoadingProps = {
  previewUrl?: string | null;
};

const STEPS: { at: number; label: StringKey; Icon: LucideIcon }[] = [
  { at: 0, label: "stepSend", Icon: Upload },
  { at: 2500, label: "stepRead", Icon: ScanSearch },
  { at: 6000, label: "stepExplain", Icon: MessageCircleMore },
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
          <FileText size={72} strokeWidth={1.6} aria-hidden="true" className="scan-placeholder" />
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
        {STEPS.map(({ label, Icon }, i) => {
          const state = i < active ? "is-done" : i === active ? "is-active" : undefined;
          return (
            <li key={label} className={state}>
              <span className="loading-step-icon" aria-hidden="true">
                {i < active ? (
                  <CheckCircle2 size={22} strokeWidth={2.4} />
                ) : i === active ? (
                  <Loader2 size={22} strokeWidth={2.4} className="spin" />
                ) : (
                  <Icon size={22} strokeWidth={2.2} />
                )}
              </span>
              {t(label)}
            </li>
          );
        })}
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
