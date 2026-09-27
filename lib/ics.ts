import { formatAmount } from "./share";
import type { ReadResult } from "./types";

// RFC 5545 text escaping: backslash, semicolon, comma, newline.
function esc(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

// Lines longer than 75 octets must be folded (CRLF + space). Folding by characters keeps it simple and valid for UTF-8 readers.
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

const ymd = (iso: string) => iso.slice(0, 10).replace(/-/g, "");

function nextDay(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function utcStamp(date = new Date()): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** All-day event on the deadline with a reminder 2 days before. */
export function buildIcs(result: ReadResult): string {
  if (!result.deadline) throw new Error("no deadline");
  const title = [result.doc_type ?? "ورقة", result.amount ? `(${formatAmount(result.amount)})` : ""].filter(Boolean).join(" ");
  const description = [result.action, result.darija_summary].filter(Boolean).join("\n\n");
  const uid = `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}@qra-lia`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Qra Lia//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${utcStamp()}`,
    `DTSTART;VALUE=DATE:${ymd(result.deadline)}`,
    `DTEND;VALUE=DATE:${ymd(nextDay(result.deadline))}`,
    `SUMMARY:${esc(`Qra Lia — ${title}`)}`,
    `DESCRIPTION:${esc(description)}`,
    "BEGIN:VALARM",
    "TRIGGER:-P2D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(`Qra Lia — ${title}`)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .map(fold)
    .join("\r\n") + "\r\n";
}

/** Download the .ics (iPhone Safari offers "Add to Calendar", Android opens the calendar app). */
export function downloadIcs(result: ReadResult): void {
  const blob = new Blob([buildIcs(result)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "qra-lia-rappel.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
