// OWNED BY MONCEF — do not edit. Reproduced here only so this package compiles standalone.
// If you need a change, ask in the group.

export type ReadResult = {
  status: "ok" | "unreadable" | "not_a_document";
  doc_type: string | null;
  sender: string | null;
  amount: { value: number; currency: string } | null;
  deadline: string | null;
  days_left: number | null;
  action: string | null;
  risk_level: "low" | "medium" | "high";
  risk_reasons: string[];
  scam_suspected: boolean;
  confidence: number;
  darija_summary: string;
  provider: "gemini" | "groq";
  latency_ms: number;
};

export type ApiError = {
  error:
    | "invalid_input"
    | "image_too_large"
    | "rate_limited"
    | "ai_unavailable"
    | "internal"
    // frontend-only code, thrown by lib/api.ts on network failure/timeout
    | "network";
  darija_message?: string;
};

export type ReadRequest = {
  imageBase64: string;
  mimeType: "image/jpeg";
};
