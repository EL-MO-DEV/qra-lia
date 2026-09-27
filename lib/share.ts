import type { ReadResult } from "./types";

// Moroccan month names (as written on local bills and letters).
const MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "ماي", "يونيو",
  "يوليوز", "غشت", "شتنبر", "أكتوبر", "نونبر", "دجنبر",
];

/** "2026-10-15" → "15 أكتوبر 2026". Parsed by hand to avoid timezone shifts; unknown formats pass through. */
export function formatDeadline(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const month = MONTHS[Number(m[2]) - 1];
  if (!month) return iso;
  return `${Number(m[3])} ${month} ${m[1]}`;
}

export function formatAmount(amount: NonNullable<ReadResult["amount"]>): string {
  const value = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(amount.value);
  const unit = ["MAD", "DH", "DHS"].includes(amount.currency.toUpperCase()) ? "درهم" : amount.currency;
  return `${value} ${unit}`;
}

/** Text only — the photo is never shared. Lines with a null value are skipped. */
export function buildShareText(result: ReadResult): string {
  const lines: string[] = [];

  const what = [result.doc_type, result.sender].filter(Boolean).join(" — ");
  if (what) lines.push(`📄 ${what}`);
  if (result.amount) lines.push(`💰 ${formatAmount(result.amount)}`);
  if (result.deadline) lines.push(`📅 قبل ${formatDeadline(result.deadline)}`);
  if (result.action) lines.push(`✅ ${result.action}`);
  const risky = result.risk_level === "high" || result.scam_suspected;
  if (risky && result.risk_reasons[0]) lines.push(`⚠️ ${result.risk_reasons[0]}`);

  const blocks = [lines.join("\n"), result.darija_summary.trim(), "— Qra Lia · تأكد ديما من الورقة الأصلية"];
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
export async function shareResult(result: ReadResult): Promise<"shared" | "cancelled" | "whatsapp"> {
  const text = buildShareText(result);
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
