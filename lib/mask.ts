// Defense in depth: mask CIN / RIB / IBAN / card numbers in every string field.
// Keep only the last 4 characters: ••••1234. Contract / client numbers are left as-is.
// Ported from @SanaaOua's backend (ma.qralia.mask.SensitiveDataMasker).
import type { ReadResult } from "./types";

const IBAN = /(?<!\w)MA(?:[ -]?\d){26}(?!\d)/gi;
const RIB = /(?<!\d)(?:\d[ -]?){23}\d(?!\d)/g;
const CARD = /(?<!\d)(?:\d[ -]?){12,18}\d(?!\d)/g;
const CIN = /(?<![A-Z0-9])[A-Z]{1,2}\d{5,6}(?![A-Z0-9])/gi;

function keepLast4(raw: string): string {
  const compact = raw.replace(/[\s-]/g, "");
  return compact.length <= 4 ? raw : `••••${compact.slice(-4)}`;
}

export function maskText(input: string): string;
export function maskText(input: string | null): string | null;
export function maskText(input: string | null): string | null {
  if (!input) return input;
  return input
    .replace(IBAN, keepLast4)
    .replace(RIB, keepLast4)
    .replace(CARD, keepLast4)
    .replace(CIN, keepLast4);
}

/** Mask every free-text field of a result. */
export function maskResult<T extends Pick<ReadResult, "doc_type" | "sender" | "action" | "risk_reasons" | "darija_summary">>(r: T): T {
  return {
    ...r,
    doc_type: maskText(r.doc_type),
    sender: maskText(r.sender),
    action: maskText(r.action),
    risk_reasons: r.risk_reasons.map((s) => maskText(s)),
    darija_summary: maskText(r.darija_summary),
  };
}
