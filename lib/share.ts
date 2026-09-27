import type { Lang, ReadResult } from "./types";

// Moroccan month names (as written on local bills and letters).
const MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "ماي", "يونيو",
  "يوليوز", "غشت", "شتنبر", "أكتوبر", "نونبر", "دجنبر",
];

/** "2026-10-15" → "15 أكتوبر 2026". Parsed by hand to avoid timezone shifts; unknown formats pass through. */
export function formatDeadline(iso: string, lang: Lang = "ar"): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  if (lang === "en") {
    const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d);
  }
  const month = MONTHS[Number(m[2]) - 1];
  if (!month) return iso;
  return `${Number(m[3])} ${month} ${m[1]}`;
}

export function formatAmount(amount: NonNullable<ReadResult["amount"]>, lang: Lang = "ar"): string {
  const value = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(amount.value);
  const isMad = ["MAD", "DH", "DHS"].includes(amount.currency.toUpperCase());
  const unit = isMad ? (lang === "en" ? "MAD" : "درهم") : amount.currency;
  return `${value} ${unit}`;
}

/** Text only — the photo is never shared. Lines with a null value are skipped. */
export function buildShareText(result: ReadResult, lang: Lang = "ar"): string {
  const lines: string[] = [];

  const what = [result.doc_type, result.sender].filter(Boolean).join(" — ");
  if (what) lines.push(`📄 ${what}`);
  if (result.amount) lines.push(`💰 ${formatAmount(result.amount, lang)}`);
  if (result.deadline) lines.push(`📅 ${lang === "en" ? "Before" : "قبل"} ${formatDeadline(result.deadline, lang)}`);
  if (result.action) lines.push(`✅ ${result.action}`);
  const risky = result.risk_level === "high" || result.scam_suspected;
  if (risky && result.risk_reasons[0]) lines.push(`⚠️ ${result.risk_reasons[0]}`);

  const blocks = [lines.join("\n"), result.darija_summary.trim(), lang === "en" ? "— Qra Lia · Always check the original paper" : "— Qra Lia · تأكد ديما من الورقة الأصلية"];
  return blocks.filter(Boolean).join("\n\n");
}

export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function openWhatsApp(text: string): void {
  const url = whatsappUrl(text);
  const tab = window.open(url, "_blank", "noopener,noreferrer");
  // Popup blocked (e.g. after a failed share sheet): navigate instead.
  if (!tab) window.location.href = url;
}

/** Native share sheet when available, else WhatsApp. Call from a tap handler. */
export async function shareResult(result: ReadResult, lang: Lang = "ar"): Promise<"shared" | "cancelled" | "whatsapp"> {
  const text = buildShareText(result, lang);
  const data = { title: "Qra Lia", text };

  if (typeof navigator.share === "function" && (!navigator.canShare || navigator.canShare(data))) {
    try {
      await navigator.share(data);
      return "shared";
    } catch (err) {
      // User closed the share sheet: stay silent.
      if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
      // Any other failure (not allowed, unsupported target…): fall through to WhatsApp.
    }
  }

  openWhatsApp(text);
  return "whatsapp";
}
