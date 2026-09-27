"use client";

import type { ReadResult } from "@/lib/types";

// STUB — final props (Part B §B3). Real share sheet / WhatsApp implementation lands next sprint.
type Props = { result: ReadResult };

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ShareButton({ result }: Props) {
  return (
    <button
      type="button"
      className="flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 border-current px-5 py-3 text-start focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-current"
    >
      <span aria-hidden="true" className="text-2xl">📤</span>
      <span className="flex flex-col items-start">
        <span className="text-xl font-bold">صيفط لشي حد من العائلة</span>
        <span dir="ltr" lang="fr" className="text-sm opacity-80">Envoyer à un proche</span>
      </span>
    </button>
  );
}

export default ShareButton;
