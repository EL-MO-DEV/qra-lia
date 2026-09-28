"use client";

import { HeartHandshake, TriangleAlert } from "lucide-react";
import { useLang } from "@/lib/i18n";

type SafetyNoteProps = {
  /** Show it as a yellow banner pinned to the top instead of the quiet default row. */
  urgent?: boolean;
};

/**
 * "If this paper matters, double check with someone you trust."
 * Quiet row at the bottom of the result by default,
 * or a yellow banner at the top when confidence < 0.6.
 */
export default function SafetyNote({ urgent = false }: SafetyNoteProps) {
  const { t } = useLang();
  const Icon = urgent ? TriangleAlert : HeartHandshake;
  return (
    <div className={urgent ? "safety safety-urgent" : "safety"} role={urgent ? "alert" : undefined}>
      <span className="safety-icon" aria-hidden="true">
        <Icon size={22} strokeWidth={2.3} />
      </span>
      <p>
        {urgent ? t("safetyUnsure") : ""}
        {t("safety")}
        <span className="fr" lang="fr">
          {urgent ? "Lecture incertaine — " : ""}Si le document est important, vérifiez avec une personne de confiance.
        </span>
      </p>
    </div>
  );
}
