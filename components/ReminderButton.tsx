"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { downloadIcs } from "@/lib/ics";
import type { ReadResult } from "@/lib/types";

type Props = { result: ReadResult };

/** Calendar reminder 2 days before the deadline. Renders nothing without a deadline or once it has passed. */
export function ReminderButton({ result }: Props) {
  const [done, setDone] = useState(false);
  const { t } = useLang();

  if (!result.deadline || result.days_left === null || result.days_left < 0) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="feature-btn"
        onClick={() => {
          downloadIcs(result);
          setDone(true);
        }}
      >
        <span className="feature-btn-icon" aria-hidden="true">
          ⏰
        </span>
        <span className="feature-btn-text">
          <span className="feature-btn-label">{t("remind")}</span>
          <span className="feature-btn-sub" lang="fr">
            Me rappeler (2 jours avant)
          </span>
        </span>
      </button>
      {done && (
        <p className="feature-toast" role="status">
          {t("reminded")}
        </p>
      )}
    </>
  );
}

export default ReminderButton;
