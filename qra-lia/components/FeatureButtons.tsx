import type { ReadResult } from "@/lib/types";

/**
 * TEMPORARY placeholders standing in for Moncef's feature components.
 * Same props as the real ones so swapping is a one-line import change
 * in ResultCard.tsx once his real files land in components/ — delete
 * this file then.
 */

export function ListenButton({ text }: { text: string }) {
  return (
    <button type="button" className="btn btn-feature" disabled title={text}>
      <span aria-hidden="true">🔊</span> <span dir="rtl">سمعني</span>
    </button>
  );
}

export function ShareButton({ result }: { result: ReadResult }) {
  return (
    <button
      type="button"
      className="btn btn-feature"
      disabled
      title={result.darija_summary}
    >
      <span aria-hidden="true">↗️</span> <span dir="rtl">شارك</span>
    </button>
  );
}

export function ReminderButton({ result }: { result: ReadResult }) {
  if (!result.deadline) return null;
  return (
    <button type="button" className="btn btn-feature" disabled>
      <span aria-hidden="true">⏰</span> <span dir="rtl">فكرني</span>
    </button>
  );
}
