"use client";

import type { ClientError } from "@/lib/api";
import { useLang, type StringKey } from "@/lib/i18n";

export type ErrorStateKind =
  | { kind: "unreadable" }
  | { kind: "not_a_document" }
  | { kind: "api"; error: ClientError };

type ErrorStateProps = {
  error: ErrorStateKind;
  onRetry: () => void;
};

function messageKey(error: ErrorStateKind): StringKey {
  switch (error.kind) {
    case "unreadable":
      return "errUnreadable";
    case "not_a_document":
      return "errNotDoc";
    case "api":
      switch (error.error.error) {
        case "invalid_input":
        case "image_too_large":
          return "errBadImage";
        case "rate_limited":
          return "errRate";
        case "ai_unavailable":
          return "errAi";
        case "network":
          return "errNetwork";
        case "internal":
        default:
          return "errOther";
      }
  }
}

/** True when the case benefits from the "how to take a good photo" tip block. */
function showTips(error: ErrorStateKind): boolean {
  if (error.kind === "unreadable" || error.kind === "not_a_document") return true;
  if (error.kind === "api" && error.error.error === "invalid_input") return true;
  return false;
}

function iconFor(error: ErrorStateKind): string {
  if (error.kind === "unreadable") return "🌫️";
  if (error.kind === "not_a_document") return "📄";
  if (error.kind === "api" && error.error.error === "network") return "📶";
  if (error.kind === "api" && error.error.error === "rate_limited") return "⏳";
  return "🧐";
}

export default function ErrorState({ error, onRetry }: ErrorStateProps) {
  const { lang, t } = useLang();
  // The server's darija_message is only used in Darija mode.
  const message =
    lang === "ar" && error.kind === "api" && error.error.darija_message ? error.error.darija_message : t(messageKey(error));
  return (
    <div className="card error-card" role="alert">
      <p className="error-icon" aria-hidden="true">
        {iconFor(error)}
      </p>
      <p className="error-message">{message}</p>

      {showTips(error) && (
        <ul className="error-tips">
          <li>{t("tip1")}</li>
          <li>{t("tip2")}</li>
          <li>{t("tip3")}</li>
        </ul>
      )}

      <button type="button" className="btn btn-primary btn-block" onClick={onRetry}>
        <span aria-hidden="true">📸</span> {t("retry")}
        <span className="fr" lang="fr" style={{ display: "inline", color: "inherit", opacity: 0.85 }}>
          Réessayer
        </span>
      </button>
    </div>
  );
}
