import type { Lang } from "./types";

/** Extra instruction appended to the user prompt when the explanation must be in English. */
export const OUTPUT_LANGUAGE_NOTE: Record<Lang, string> = {
  ar: "",
  en: "\nIMPORTANT: write darija_summary, action, doc_type and risk_reasons in simple, clear English (NOT Darija), " +
    "short sentences, as if explaining to an elderly parent. Keep the JSON field names unchanged.",
};

export function parseLang(value: unknown): Lang {
  return value === "en" ? "en" : "ar";
}
