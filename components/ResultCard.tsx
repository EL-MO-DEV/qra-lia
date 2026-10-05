"use client";

import {
  AlarmClock,
  CalendarDays,
  Camera,
  CircleCheck,
  Clock,
  FileText,
  ListChecks,
  MessageSquareQuote,
  OctagonAlert,
  ShieldAlert,
  ShieldCheck,
  Siren,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import type { Lang, ReadResult } from "@/lib/types";
import { useLang, type StringKey } from "@/lib/i18n";
import { formatAmount, formatDeadline } from "@/lib/share";
import SafetyNote from "./SafetyNote";
import ListenButton from "./ListenButton";
import ReminderButton from "./ReminderButton";
import ShareButton from "./ShareButton";
import ShowWhere from "./ShowWhere";

type ResultCardProps = {
  result: ReadResult;
  onRetake: () => void;
  previewUrl?: string | null;
};

type T = (key: StringKey, vars?: Record<string, string | number>) => string;

const RISK: Record<ReadResult["risk_level"], { Icon: LucideIcon; label: StringKey; fr: string; className: string }> = {
  low: { Icon: ShieldCheck, label: "riskLow", fr: "Normal", className: "risk-low" },
  medium: { Icon: TriangleAlert, label: "riskMedium", fr: "Attention", className: "risk-medium" },
  high: { Icon: ShieldAlert, label: "riskHigh", fr: "Urgent", className: "risk-high" },
};

function daysLeftPill(daysLeft: number | null, t: T): { text: string; className: string; Icon: LucideIcon } | null {
  if (daysLeft === null) return null;
  if (daysLeft < 0) return { text: t("deadlinePassed"), className: "pill pill-urgent", Icon: OctagonAlert };
  if (daysLeft === 0) return { text: t("deadlineToday"), className: "pill pill-urgent", Icon: AlarmClock };
  if (daysLeft <= 3) return { text: t("daysLeftFew", { n: daysLeft }), className: "pill pill-urgent", Icon: AlarmClock };
  if (daysLeft <= 7) return { text: t("daysLeft", { n: daysLeft }), className: "pill pill-soon", Icon: Clock };
  return { text: t("daysLeft", { n: daysLeft }), className: "pill", Icon: CircleCheck };
}

/** Everything on the card as one spoken text, read by the top "listen" button. */
function spokenResult(result: ReadResult, pill: ReturnType<typeof daysLeftPill>, lang: Lang, t: T): string {
  const en = lang === "en";
  const parts: string[] = [];
  if (result.scam_suspected) parts.push(en ? "Careful! This paper shows signs of a scam." : "رد البال! هاد الورقة فيها علامات ديال النصب.");
  else parts.push(`${en ? "Risk level" : "مستوى الخطر"}: ${t(RISK[result.risk_level].label)}.`);
  if (result.doc_type) {
    const from = result.sender ? `${en ? " from" : " من"} ${result.sender}` : "";
    parts.push(`${en ? "This is" : "هادي"} ${result.doc_type}${from}.`);
  }
  if (result.amount) parts.push(`${en ? "Amount" : "المبلغ"}: ${formatAmount(result.amount, lang)}.`);
  if (result.deadline) {
    const left = pill ? `${en ? ", " : "، "}${pill.text}` : "";
    parts.push(`${en ? "Deadline: before" : "الأجل: قبل"} ${formatDeadline(result.deadline, lang)}${left}.`);
  }
  if (result.action) parts.push(`${t("whatToDo")}: ${result.action}.`);
  parts.push(result.darija_summary);
  parts.push(t("safety"));
  const full = parts.join(" ");
  // /api/tts accepts up to 800 characters (~2 min of speech, under Vercel's 4.5 MB response cap).
  if (full.length <= 800) return full;
  return result.darija_summary.slice(0, 800);
}

export default function ResultCard({ result, onRetake, previewUrl }: ResultCardProps) {
  const { lang, t } = useLang();
  const risk = RISK[result.risk_level];
  const pill = daysLeftPill(result.days_left, t);
  const lowConfidence = result.confidence < 0.6;
  // Reasons are shown in the scam alert; otherwise under the risk badge.
  const reasons = result.scam_suspected ? [] : result.risk_reasons;
  const HeroIcon = result.scam_suspected ? Siren : FileText;

  return (
    <div className="result">
      {/* Read the whole card aloud: first thing on the screen */}
      <ListenButton text={spokenResult(result, pill, lang, t)} label={t("listenAll")} sub="Tout écouter" />

      {lowConfidence && <SafetyNote urgent />}

      {result.scam_suspected && (
        <div className="scam-alert" role="alert">
          <div className="scam-alert-head">
            <span className="scam-alert-icon" aria-hidden="true">
              <Siren size={28} strokeWidth={2.4} />
            </span>
            <div>
              <h2>{t("scamTitle")}</h2>
              <p className="fr" lang="fr">
                Attention : signes d&apos;arnaque
              </p>
            </div>
          </div>
          {result.risk_reasons.length > 0 && (
            <ul>
              {result.risk_reasons.map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 1–2. Risk + what it is */}
      <div className={`risk-hero ${risk.className}`}>
        <span className="risk-icon" aria-hidden="true">
          <HeroIcon size={30} strokeWidth={2.2} />
        </span>
        <div className="risk-body">
          <span className="risk-level">
            <risk.Icon size={18} strokeWidth={2.6} aria-hidden="true" /> {t(risk.label)}
            <span className="fr-inline" lang="fr">
              · {risk.fr}
            </span>
          </span>
          {result.doc_type && <p className="risk-doc">{result.doc_type}</p>}
          {result.sender && <p className="risk-sender">{result.sender}</p>}
          {reasons.length > 0 && (
            <ul className="reasons">
              {reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 3. Amount + deadline — biggest text on the screen, as a ticket */}
      {(result.amount || result.deadline) && (
        <div className="ticket">
          {result.amount && (
            <div className="ticket-top">
              <p className="ticket-label">{lang === "en" ? "Amount" : "المبلغ"}</p>
              <p className="money-amount">{formatAmount(result.amount, lang)}</p>
            </div>
          )}
          {result.amount && result.deadline && <div className="ticket-cut" aria-hidden="true" />}
          {result.deadline && (
            <div className="ticket-bottom">
              <p className="money-deadline">
                <CalendarDays size={26} strokeWidth={2.3} aria-hidden="true" />
                {t("before")} {formatDeadline(result.deadline, lang)}
              </p>
              {pill && (
                <span className={pill.className}>
                  <pill.Icon size={18} strokeWidth={2.5} aria-hidden="true" /> {pill.text}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3b. Show me where it's written on the photo (trust: check with your own eyes) */}
      {previewUrl && <ShowWhere result={result} previewUrl={previewUrl} />}

      {/* 4. What to do */}
      {result.action && (
        <div className="card todo">
          <span className="card-icon card-icon-primary" aria-hidden="true">
            <ListChecks size={24} strokeWidth={2.4} />
          </span>
          <div>
            <p className="card-label">{t("whatToDo")}</p>
            <p className="todo-text">{result.action}</p>
          </div>
        </div>
      )}

      {/* 5. Explanation */}
      {result.darija_summary && (
        <div className="card summary">
          <p className="card-label">
            <MessageSquareQuote size={20} strokeWidth={2.4} aria-hidden="true" /> {t("explanation")}
          </p>
          <p className="summary-text">{result.darija_summary}</p>
        </div>
      )}

      {/* 6. Share / Reminder (Listen is at the top) */}
      <div className="actions">
        <ShareButton result={result} />
        <ReminderButton result={result} />
      </div>

      {/* 7. Safety note (moved to the top as a banner when confidence is low) */}
      {!lowConfidence && <SafetyNote />}

      {/* 8. Secondary action */}
      <button type="button" className="btn btn-ghost btn-block btn-lg" onClick={onRetake}>
        <Camera size={24} strokeWidth={2.3} aria-hidden="true" /> {t("retake")}
      </button>

      {previewUrl && (
        <div className="photo-thumb">
          {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
          <img src={previewUrl} alt="" aria-hidden="true" />
          <span>{t("photoNote")}</span>
        </div>
      )}
    </div>
  );
}
