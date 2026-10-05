// Pure helpers for the medicine schedule (used by the /dwa page, the API and tests).
import type { Lang } from "./types";

export const SLOTS = ["morning", "noon", "evening", "night"] as const;
export type Slot = (typeof SLOTS)[number];

export type Medicine = {
  name: string;
  dose: string | null;
  slots: Slot[];
  food: "before" | "after" | "with" | null;
  duration_days: number | null;
  note: string | null;
};

export type MedsResult = {
  status: "ok" | "unreadable" | "not_medical";
  kind: "prescription" | "medicine_box" | "leaflet" | "other";
  medicines: Medicine[];
  warnings: string[];
  confidence: number;
  summary: string;
  provider: "gemini" | "groq";
  latency_ms: number;
};

/** Local reminder time for each slot (24h). */
export const SLOT_TIME: Record<Slot, { h: number; m: number }> = {
  morning: { h: 8, m: 0 },
  noon: { h: 13, m: 0 },
  evening: { h: 20, m: 0 },
  night: { h: 22, m: 0 },
};

export const SLOT_LABEL: Record<Lang, Record<Slot, string>> = {
  ar: { morning: "الصباح", noon: "الغدا", evening: "العشية", night: "قبل النعاس" },
  en: { morning: "Morning", noon: "Noon", evening: "Evening", night: "Bedtime" },
};

export const FOOD_LABEL: Record<Lang, Record<NonNullable<Medicine["food"]>, string>> = {
  ar: { before: "قبل الماكلة", after: "من بعد الماكلة", with: "مع الماكلة" },
  en: { before: "before food", after: "after food", with: "with food" },
};

export const DEFAULT_REMINDER_DAYS = 7;
export const MAX_REMINDER_DAYS = 30;

/** Medicines grouped by time of day, in day order. */
export function bySlot(meds: Medicine[]): { slot: Slot; meds: Medicine[] }[] {
  return SLOTS.map((slot) => ({ slot, meds: meds.filter((m) => m.slots.includes(slot)) })).filter((g) => g.meds.length > 0);
}

export function daysLabel(n: number, lang: Lang): string {
  if (lang === "en") return `${n} day${n > 1 ? "s" : ""}`;
  return n === 1 ? "نهار واحد" : n === 2 ? "يوماين" : `${n} أيام`;
}

/** One line per medicine: "Doliprane 1g — 1 comprimé · الصباح، العشية · من بعد الماكلة · 5 أيام". */
export function medicineLine(m: Medicine, lang: Lang): string {
  const parts = [
    m.dose,
    m.slots.length ? m.slots.map((s) => SLOT_LABEL[lang][s]).join(lang === "ar" ? "، " : ", ") : null,
    m.food ? FOOD_LABEL[lang][m.food] : null,
    m.duration_days ? daysLabel(m.duration_days, lang) : null,
  ].filter(Boolean);
  return parts.length ? `${m.name} — ${parts.join(" · ")}` : m.name;
}

/** Text for the family share sheet / WhatsApp (never the photo). */
export function medsShareText(r: MedsResult, lang: Lang): string {
  const lines = r.medicines.map((m, i) => `${i + 1}. ${medicineLine(m, lang)}${m.note ? `\n   ${m.note}` : ""}`);
  const footer = lang === "en" ? "— Qra Lia · Always check with your pharmacist" : "— Qra Lia · تأكد ديما مع الصيدلي";
  return [`💊 ${lang === "en" ? "Medicines" : "الدوا"}`, ...lines, "", r.summary, "", footer].join("\n");
}

const pad = (n: number) => String(n).padStart(2, "0");

function esc(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 70) {
    out.push(rest.slice(0, 70));
    rest = " " + rest.slice(70);
  }
  out.push(rest);
  return out.join("\r\n");
}

/**
 * Daily calendar reminders, one repeating event per time of day, in the phone's local time (floating time).
 * Repeats for the longest written duration of the medicines at that time, else DEFAULT_REMINDER_DAYS (max 30).
 * Starts today if the time is still ahead, else tomorrow.
 */
export function buildMedsIcs(r: MedsResult, lang: Lang, now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const events = bySlot(r.medicines).flatMap(({ slot, meds }) => {
    const { h, m } = SLOT_TIME[slot];
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
    if (start <= now) start.setDate(start.getDate() + 1);
    const written = Math.max(0, ...meds.map((x) => x.duration_days ?? 0));
    const count = Math.min(MAX_REMINDER_DAYS, written || DEFAULT_REMINDER_DAYS);
    const dt = `${start.getFullYear()}${pad(start.getMonth() + 1)}${pad(start.getDate())}T${pad(h)}${pad(m)}00`;
    const title = `💊 ${SLOT_LABEL[lang][slot]}: ${meds.map((x) => x.name).join(", ")}`;
    const desc = meds.map((x) => medicineLine(x, lang)).join("\n");
    return [
      "BEGIN:VEVENT",
      `UID:${slot}-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}@qra-lia`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${dt}`,
      "DURATION:PT15M",
      `RRULE:FREQ=DAILY;COUNT=${count}`,
      `SUMMARY:${esc(title)}`,
      `DESCRIPTION:${esc(desc)}`,
      "BEGIN:VALARM",
      "TRIGGER:PT0M",
      "ACTION:DISPLAY",
      `DESCRIPTION:${esc(title)}`,
      "END:VALARM",
      "END:VEVENT",
    ];
  });
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Qra Lia//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", ...events, "END:VCALENDAR"]
    .map(fold)
    .join("\r\n");
}

/** Spoken version: the schedule by time of day, then the model's summary, within the TTS limit. */
export function medsSpoken(r: MedsResult, lang: Lang): string {
  const groups = bySlot(r.medicines)
    .map(({ slot, meds }) => `${SLOT_LABEL[lang][slot]}: ${meds.map((m) => [m.dose, m.name].filter(Boolean).join(" ")).join(lang === "ar" ? "، و " : ", and ")}.`)
    .join(" ");
  const full = [groups, r.summary].filter(Boolean).join(" ");
  return full.length <= 800 ? full : r.summary.slice(0, 800);
}
