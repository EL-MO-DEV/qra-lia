import type { ReadResult } from "@/lib/types";
import { formatAmount, formatDeadline } from "@/lib/share";
import SafetyNote from "./SafetyNote";
import ListenButton from "./ListenButton";
import ReminderButton from "./ReminderButton";
import ShareButton from "./ShareButton";

type ResultCardProps = {
  result: ReadResult;
  onRetake: () => void;
  previewUrl?: string | null;
};

const RISK: Record<ReadResult["risk_level"], { icon: string; label: string; fr: string; className: string }> = {
  low: { icon: "🟢", label: "عادي", fr: "Normal", className: "risk-low" },
  medium: { icon: "🟠", label: "رد البال", fr: "Attention", className: "risk-medium" },
  high: { icon: "🔴", label: "خطر", fr: "Urgent", className: "risk-high" },
};

function daysLeftPill(daysLeft: number | null) {
  if (daysLeft === null) return null;
  if (daysLeft < 0) return { text: "الأجل فات", className: "pill pill-urgent", icon: "⛔" };
  if (daysLeft === 0) return { text: "اليوم هو آخر أجل", className: "pill pill-urgent", icon: "⏰" };
  if (daysLeft <= 3) return { text: `بقاو غير ${daysLeft} أيام`, className: "pill pill-urgent", icon: "⏰" };
  if (daysLeft <= 7) return { text: `بقاو ${daysLeft} أيام`, className: "pill pill-soon", icon: "⏳" };
  return { text: `بقاو ${daysLeft} يوم`, className: "pill", icon: "📅" };
}

/** Everything on the card as one spoken text, read by the top 🔊 button. */
function spokenResult(result: ReadResult, pill: ReturnType<typeof daysLeftPill>): string {
  const parts: string[] = [];
  if (result.scam_suspected) parts.push("رد البال! هاد الورقة فيها علامات ديال النصب.");
  else parts.push(`مستوى الخطر: ${RISK[result.risk_level].label}.`);
  if (result.doc_type) parts.push(`هادي ${result.doc_type}${result.sender ? ` من ${result.sender}` : ""}.`);
  if (result.amount) parts.push(`المبلغ: ${formatAmount(result.amount)}.`);
  if (result.deadline) parts.push(`الأجل: قبل ${formatDeadline(result.deadline)}${pill ? `، ${pill.text}` : ""}.`);
  if (result.action) parts.push(`شنو خاصك دير: ${result.action}.`);
  parts.push(result.darija_summary);
  parts.push("وإلا كانت الورقة مهمة، تأكد مع شي حد تيق فيه.");
  const full = parts.join(" ");
  // /api/tts accepts up to 800 characters (~2 min of speech, under Vercel's 4.5 MB response cap).
  if (full.length <= 800) return full;
  return result.darija_summary.length <= 800 ? result.darija_summary : result.darija_summary.slice(0, 800);
}

export default function ResultCard({ result, onRetake, previewUrl }: ResultCardProps) {
  const risk = RISK[result.risk_level];
  const pill = daysLeftPill(result.days_left);
  const lowConfidence = result.confidence < 0.6;
  // Reasons are shown in the scam alert; otherwise under the risk badge.
  const reasons = result.scam_suspected ? [] : result.risk_reasons;

  return (
    <div className="result">
      {/* Read the whole card aloud: first thing on the screen */}
      <ListenButton text={spokenResult(result, pill)} label="سمع كلشي بالصوت" sub="Tout écouter" />

      {lowConfidence && <SafetyNote urgent />}

      {result.scam_suspected && (
        <div className="scam-alert" role="alert">
          <h2>⚠️ رد البال! هادي فيها علامات ديال النصب</h2>
          <p className="fr" lang="fr" style={{ color: "inherit" }}>
            Attention : signes d&apos;arnaque
          </p>
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
          {result.scam_suspected ? "🚨" : "📄"}
        </span>
        <div>
          <span className="risk-level">
            <span aria-hidden="true">{risk.icon}</span> {risk.label}
            <span lang="fr" style={{ fontWeight: 500, opacity: 0.8 }}>
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

      {/* 3. Amount + deadline — biggest text on the screen */}
      {(result.amount || result.deadline) && (
        <div className="card money">
          {result.amount && <p className="money-amount">{formatAmount(result.amount)}</p>}
          {result.deadline && <p className="money-deadline">قبل {formatDeadline(result.deadline)}</p>}
          {pill && (
            <span className={pill.className}>
              <span aria-hidden="true">{pill.icon}</span> {pill.text}
            </span>
          )}
        </div>
      )}

      {/* 4. What to do */}
      {result.action && (
        <div className="card todo">
          <span className="todo-icon" aria-hidden="true">
            ✅
          </span>
          <div>
            <p className="card-label">شنو خاصك دير</p>
            <p>{result.action}</p>
          </div>
        </div>
      )}

      {/* 5. Darija explanation */}
      {result.darija_summary && (
        <div className="card summary">
          <p className="card-label">
            <span aria-hidden="true">🗣️</span> الشرح بالدارجة
          </p>
          <p>{result.darija_summary}</p>
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
      <button type="button" className="btn btn-ghost btn-block" onClick={onRetake}>
        <span aria-hidden="true">📸</span> صوّر ورقة أخرى
      </button>

      {previewUrl && (
        <div className="photo-thumb">
          {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
          <img src={previewUrl} alt="" aria-hidden="true" />
          <span>التصويرة ديالك ما تحفظاتش، غير كتبان هنا دابا.</span>
        </div>
      )}
    </div>
  );
}
