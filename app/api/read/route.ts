// POST /api/read — photo of a paper document → ReadResult (CDC-backend-ai §4–§5).
// Logic ported from @SanaaOua's Spring Boot backend (DocumentReadService) so it runs on Vercel:
// validate → Gemini (15 s, JSON retry once) → Groq fallback → mask → risk rules + days_left.
import { extractWithGemini, geminiEnabled } from "@/lib/gemini";
import { extractWithGroq, groqEnabled } from "@/lib/groq";
import { maskResult } from "@/lib/mask";
import { applyRules } from "@/lib/rules";
import { InvalidModelOutput, type ModelExtraction } from "@/lib/schema";
import type { ApiError, ApiErrorCode, ReadResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const RATE_LIMIT_PER_MINUTE = 30;

const AI_UNAVAILABLE = "ما قدرناش نقراو الورقة دابا، عاود من بعد شوية.";
const NOT_OK_SUMMARY = {
  unreadable: "الصورة ما واضحاش. عاود صوّر فضو مزيان وبلا ما تحرك التيليفون.",
  not_a_document: "هادي ما باناتش ورقة. صوّر الورقة كاملة من الفوق.",
} as const;

// Best-effort per-instance rate limit (serverless instances don't share memory).
const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => t > now - 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_LIMIT_PER_MINUTE;
}

function fail(requestId: string, status: number, error: ApiErrorCode, darija_message?: string) {
  // Never log the image, extracted text, names or numbers.
  console.warn(JSON.stringify({ requestId, error }));
  const body: ApiError = darija_message ? { error, darija_message } : { error };
  return Response.json(body, { status });
}

type Provider = ReadResult["provider"];
type Extractor = (b64: string, mime: string, retry?: boolean) => Promise<ModelExtraction>;

function errorDetail(e: unknown): string {
  return e instanceof Error ? e.message.slice(0, 300) : "unknown";
}

/** One provider, with a single retry when the reply is not valid JSON. Null = give up on it. */
async function tryProvider(requestId: string, name: Provider, extract: Extractor, b64: string, mime: string) {
  try {
    return await extract(b64, mime);
  } catch (e) {
    // detail = HTTP status + provider message (e.g. "gemini http 400: API key not valid"), never document data
    console.warn(JSON.stringify({ requestId, provider: name, failed: e instanceof InvalidModelOutput ? "invalid_json" : "provider", detail: errorDetail(e) }));
    if (!(e instanceof InvalidModelOutput)) return null;
    try {
      return await extract(b64, mime, true);
    } catch (retryError) {
      console.warn(JSON.stringify({ requestId, provider: name, failed: "retry", detail: errorDetail(retryError) }));
      return null;
    }
  }
}

export async function POST(request: Request) {
  const started = Date.now();
  const requestId = crypto.randomUUID();

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) return fail(requestId, 429, "rate_limited");

  // 1. Validate
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(requestId, 400, "invalid_input");
  }
  const { imageBase64, mimeType } = (body ?? {}) as { imageBase64?: unknown; mimeType?: unknown };
  if (typeof imageBase64 !== "string" || typeof mimeType !== "string" || !MIME_TYPES.includes(mimeType)) {
    return fail(requestId, 400, "invalid_input");
  }
  const b64 = imageBase64.replace(/^data:[^,]*,/, "").replace(/\s/g, "");
  if (!b64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) return fail(requestId, 400, "invalid_input");
  if (Math.floor((b64.length * 3) / 4) > MAX_IMAGE_BYTES) return fail(requestId, 413, "image_too_large");

  try {
    // 2–5. Gemini, then Groq, else 502
    let provider: Provider = "gemini";
    let extraction = geminiEnabled() ? await tryProvider(requestId, "gemini", extractWithGemini, b64, mimeType) : null;
    if (!extraction && groqEnabled()) {
      provider = "groq";
      extraction = await tryProvider(requestId, "groq", extractWithGroq, b64, mimeType);
    }
    if (!extraction) return fail(requestId, 502, "ai_unavailable", AI_UNAVAILABLE);

    let result: ReadResult;
    if (extraction.status !== "ok") {
      // Unreadable / not a document: never pass on guessed fields.
      result = {
        status: extraction.status,
        doc_type: null, sender: null, amount: null, deadline: null, days_left: null, action: null,
        risk_level: "low", risk_reasons: [], scam_suspected: false,
        confidence: extraction.confidence,
        darija_summary: NOT_OK_SUMMARY[extraction.status],
        provider, latency_ms: 0,
      };
    } else {
      // 6. Mask (defense in depth), 7. deterministic rules (days_left, risk)
      const masked = maskResult(extraction);
      const ruled = applyRules(masked);
      result = {
        status: "ok",
        doc_type: masked.doc_type,
        sender: masked.sender,
        amount: masked.amount,
        deadline: masked.deadline,
        days_left: ruled.days_left,
        action: masked.action,
        risk_level: ruled.risk_level,
        risk_reasons: ruled.risk_reasons,
        scam_suspected: ruled.scam_suspected,
        confidence: masked.confidence,
        darija_summary: masked.darija_summary,
        provider,
        latency_ms: 0,
      };
    }

    // 8. provider + latency
    result.latency_ms = Date.now() - started;
    console.info(JSON.stringify({ requestId, status: result.status, provider, latency_ms: result.latency_ms, risk: result.risk_level }));
    return Response.json(result);
  } catch {
    return fail(requestId, 500, "internal");
  }
}
