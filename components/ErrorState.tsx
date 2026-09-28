"use client";

import { Camera, CircleAlert, FileQuestion, Hourglass, ImageOff, Lightbulb, WifiOff, type LucideIcon } from "lucide-react";
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

const ICONS = {
  unreadable: ImageOff,
  not_a_document: FileQuestion,
  network: WifiOff,
  rate_limited: Hourglass,
  other: CircleAlert,
} satisfies Record<string, LucideIcon>;

function iconKey(error: ErrorStateKind): keyof typeof ICONS {
  if (error.kind !== "api") return error.kind;
  if (error.error.error === "network" || error.error.error === "rate_limited") return error.error.error;
  return "other";
}

const TIPS: StringKey[] = ["tip1", "tip2", "tip3"];

export default function ErrorState({ error, onRetry }: ErrorStateProps) {
  const { lang, t } = useLang();
  const Icon = ICONS[iconKey(error)];
  // The server's darija_message is only used in Darija mode.
  const message =
    lang === "ar" && error.kind === "api" && error.error.darija_message ? error.error.darija_message : t(messageKey(error));
  return (
    <div className="card error-card" role="alert">
      <span className="error-icon" aria-hidden="true">
        <Icon size={44} strokeWidth={2} />
      </span>
      <p className="error-message">{message}</p>

      {showTips(error) && (
        <ul className="error-tips">
          {TIPS.map((tip) => (
            <li key={tip}>
              <Lightbulb size={20} strokeWidth={2.3} aria-hidden="true" />
              <span>{t(tip)}</span>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="btn btn-primary btn-block btn-lg" onClick={onRetry}>
        <Camera size={24} strokeWidth={2.3} aria-hidden="true" /> {t("retry")}
        <span className="fr-inline" lang="fr">
          Réessayer
        </span>
      </button>
    </div>
  );
}
