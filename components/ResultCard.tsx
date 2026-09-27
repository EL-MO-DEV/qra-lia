import type { ReadResult } from "@/lib/types";
import SafetyNote from "./SafetyNote";
// TEMPORARY placeholders — Moncef's real ListenButton/ShareButton/
// ReminderButton files weren't found in components/ yet (checked and got
// "Module not found"). Swap this single import line for the real ones as
// soon as you know the actual filenames — nothing else needs to change.
import { ListenButton, ReminderButton, ShareButton } from "./FeatureButtons";

type ResultCardProps = {
  result: ReadResult;
  onRetake: () => void;
};

const RISK_BADGE: Record<
  ReadResult["risk_level"],
  { icon: string; label: string; className: string }
> = {
  low: { icon: "🟢", label: "عادي", className: "badge-low" },
  medium: { icon: "🟠", label: "رد البال", className: "badge-medium" },
  high: { icon: "🔴", label: "خطر", className: "badge-high" },
};

function formatAmount(amount: ReadResult["amount"]) {
  if (!amount) return null;
  const currency = amount.currency === "MAD" ? "درهم" : amount.currency;
  return `${amount.value} ${currency}`;
}

function formatDaysLeft(daysLeft: number | null) {
  if (daysLeft === null) return null;
  if (daysLeft < 0) return "الأجل فات";
  return `بقاو ${daysLeft} يوم`;
}

export default function ResultCard({ result, onRetake }: ResultCardProps) {
  const badge = RISK_BADGE[result.risk_level];
  const amountText = formatAmount(result.amount);
  const daysLeftText = formatDaysLeft(result.days_left);
  const lowConfidence = result.confidence < 0.6;

  return (
    <div className="screen result-screen">
      {/* Low-confidence banner replaces the bottom SafetyNote position with a top one */}
      {lowConfidence && <SafetyNote urgent />}

      <div className="result-card">
        {/* 1. Risk badge (+ scam banner) */}
        <div className={`risk-badge ${badge.className}`}>
          <span aria-hidden="true">{badge.icon}</span>
          <span dir="rtl">{badge.label}</span>
        </div>

        {result.scam_suspected && (
          <div className="scam-banner" role="alert">
            <p dir="rtl">⚠️ هادي فيها علامات ديال النصب</p>
            {result.risk_reasons.length > 0 && (
              <ul dir="rtl">
                {result.risk_reasons.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* 2. What it is */}
        {(result.doc_type || result.sender) && (
          <div className="row row-doc-info" dir="rtl">
            {result.doc_type && <p className="doc-type">{result.doc_type}</p>}
            {result.sender && <p className="sender">{result.sender}</p>}
          </div>
        )}

        {/* 3. Amount + deadline — biggest text on the screen */}
        {(amountText || result.deadline || daysLeftText) && (
          <div className="row row-amount-deadline" dir="rtl">
            {amountText && <p className="amount">{amountText}</p>}
            {result.deadline && <p className="deadline">قبل {result.deadline}</p>}
            {daysLeftText && <p className="days-left">{daysLeftText}</p>}
          </div>
        )}

        {/* 4. What to do */}
        {result.action && (
          <div className="row row-action" dir="rtl">
            <span aria-hidden="true">✅</span>
            <p>{result.action}</p>
          </div>
        )}

        {/* 5. Darija explanation */}
        {result.darija_summary && (
          <div className="row row-summary" dir="rtl">
            <p>{result.darija_summary}</p>
          </div>
        )}

        {/* 6. Action row — placeholders until Moncef's components arrive */}
        <div className="row row-feature-buttons">
          <ListenButton text={result.darija_summary} />
          <ShareButton result={result} />
          <ReminderButton result={result} />
        </div>

        {/* 7. SafetyNote — quiet row at the bottom unless confidence is low (shown above instead) */}
        {!lowConfidence && <SafetyNote />}

        {/* 8. Secondary action */}
        <button type="button" className="btn btn-secondary" onClick={onRetake}>
          <span aria-hidden="true">📸</span> <span dir="rtl">صوّر ورقة أخرى</span>
        </button>
      </div>
    </div>
  );
}
