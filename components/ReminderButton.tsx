"use client";

import type { ReadResult } from "@/lib/types";

// STUB — final props (Part B §B3). Real .ics download lands next sprint.
// Already final: renders nothing without a deadline or once the deadline has passed.
type Props = { result: ReadResult };

export function ReminderButton({ result }: Props) {
  if (!result.deadline || result.days_left === null || result.days_left < 0) {
    return null;
  }

  return (
    <button
      type="button"
      className="flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 border-current px-5 py-3 text-start focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-current"
    >
      <span aria-hidden="true" className="text-2xl">⏰</span>
      <span className="flex flex-col items-start">
        <span className="text-xl font-bold">فكّرني قبل الأجل</span>
        <span dir="ltr" lang="fr" className="text-sm opacity-80">Me rappeler</span>
      </span>
    </button>
  );
}

export default ReminderButton;
