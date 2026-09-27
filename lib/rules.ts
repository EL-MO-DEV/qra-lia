// Deterministic overlay on the model's risk. Final risk = the higher of model vs rules.
// Ported from @SanaaOua's backend (ma.qralia.rules.RiskRulesEngine).
import type { RiskLevel } from "./types";

export const REASON_DEADLINE_PASSED = "الأجل فات";
export const REASON_FEW_DAYS = "بقاو غير أيام قلال";
export const REASON_SOON = "الأجل قريب (أقل من 7 أيام)";
export const REASON_VERIFY = "تأكد مع شي حد";
export const REASON_LEGAL = "إشارات قانونية خطيرة (محكمة / استخلاص / قطع)";
export const REASON_SCAM = "علامات ديال النصب";

export const LEGAL_KEYWORDS = [
  "tribunal", "huissier", "recouvrement", "coupure", "mise en demeure",
  "assignation", "saisie", "contentieux", "coupure d'eau", "coupure d'électricité",
  "محكمة", "محكمه", "تبليغ قضائي", "إنذار قانوني", "انذار قانوني",
  "استخلاص", "تحصيل الديون", "قطع الكهرباء", "قطع الضوء", "قطع الماء",
  "قطيعة", "huissier de justice",
];

export const SCAM_KEYWORDS = [
  "cvv", "cvc", "code otp", "otp", "mot de passe", "password", "code carte",
  "numéro de carte", "numero de carte", "code secret",
  "bit.ly", "tinyurl", "t.ly", "rb7ti", "ربحت", "جائزة", "félicitations tu as",
  "compte personnel", "حساب شخصي", "حساب بنكي شخصي",
  "كود ديال الكرط", "كود البطاقة", "موت دو باس", "رقم البطاقة",
];

export const TIMEZONE = "Africa/Casablanca";

const RANK: Record<RiskLevel, number> = { low: 1, medium: 2, high: 3 };
const LEVELS: RiskLevel[] = ["low", "low", "medium", "high"];

/** Today's date (YYYY-MM-DD) in Morocco. */
export function todayIn(timeZone = TIMEZONE, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function daysLeft(deadline: string | null, today = todayIn()): number | null {
  if (!deadline) return null;
  const d = Date.parse(`${deadline.slice(0, 10)}T00:00:00Z`);
  const t = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(d) || Number.isNaN(t)) return null;
  return Math.round((d - t) / 86_400_000);
}

export type RuleInput = {
  doc_type: string | null;
  sender: string | null;
  action: string | null;
  darija_summary: string;
  deadline: string | null;
  risk_level: RiskLevel;
  risk_reasons: string[];
  scam_suspected: boolean;
  confidence: number;
};

export type Ruled = {
  days_left: number | null;
  risk_level: RiskLevel;
  risk_reasons: string[];
  scam_suspected: boolean;
};

export function applyRules(r: RuleInput, today = todayIn()): Ruled {
  const left = daysLeft(r.deadline, today);
  let score = RANK[r.risk_level] ?? 1;
  const reasons = new Set(r.risk_reasons);
  let scam = r.scam_suspected;
  const haystack = [r.doc_type, r.sender, r.action, r.darija_summary, ...r.risk_reasons]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (left !== null && left < 0) {
    score = Math.max(score, 3);
    reasons.add(REASON_DEADLINE_PASSED);
  } else if (left !== null && left <= 3) {
    score = Math.max(score, 3);
    reasons.add(REASON_FEW_DAYS);
  } else if (left !== null && left <= 7) {
    score = Math.max(score, 2);
    reasons.add(REASON_SOON);
  }

  if (LEGAL_KEYWORDS.some((k) => haystack.includes(k.toLowerCase()))) {
    score = Math.max(score, 3);
    reasons.add(REASON_LEGAL);
  }

  if (scam || SCAM_KEYWORDS.some((k) => haystack.includes(k.toLowerCase()))) {
    scam = true;
    score = Math.max(score, 3);
    reasons.add(REASON_SCAM);
  }

  if (r.confidence < 0.6) reasons.add(REASON_VERIFY);

  return { days_left: left, risk_level: LEVELS[score], risk_reasons: [...reasons], scam_suspected: scam };
}
