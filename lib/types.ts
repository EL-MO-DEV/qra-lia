export type ReadStatus = "ok" | "unreadable" | "not_a_document";
export type RiskLevel = "low" | "medium" | "high";

export type ReadResult = {
  status: ReadStatus;
  doc_type: string | null;
  sender: string | null;
  amount: { value: number; currency: string } | null;
  deadline: string | null;      // ISO "YYYY-MM-DD"
  days_left: number | null;     // computed by the server
  action: string | null;
  risk_level: RiskLevel;
  risk_reasons: string[];
  scam_suspected: boolean;
  confidence: number;           // 0..1
  darija_summary: string;       // Darija, Arabic script
  provider: "gemini" | "groq";
  latency_ms: number;
};

export type ApiErrorCode =
  | "invalid_input" | "image_too_large" | "rate_limited" | "ai_unavailable" | "internal";

export type ApiError = { error: ApiErrorCode; darija_message?: string };

export type ReadRequest = { imageBase64: string; mimeType: "image/jpeg" | "image/png" | "image/webp" };
