// Fallback provider: Groq (OpenAI-compatible chat completions with a vision model).
// Ported from @SanaaOua's backend (ma.qralia.ai.GroqVisionClient).
import { OUTPUT_LANGUAGE_NOTE } from "./lang";
import { RETRY_INSTRUCTION, SYSTEM_PROMPT, USER_INSTRUCTION } from "./prompt";
import type { Lang } from "./types";
import { MODEL_JSON_SCHEMA, ProviderError, parseModelOutput, providerErrorDetail, type ModelExtraction } from "./schema";

const BUDGET_MS = 12_000; // Gemini budget (16 s) + Groq stays under the app's 30 s timeout
const DEFAULT_MODEL = "qwen/qwen3.8-27b";
// Free tier: 1000 output tokens per minute, and Groq counts the *requested* max against it.
// Without a cap it requested ~1440 and refused the call. The JSON answer needs ~300–600.
const MAX_OUTPUT_TOKENS = 800;
// Rate limited (429): wait what Groq asks, at most this long, then retry once.
const MAX_RETRY_WAIT_MS = 6_000;

// Trimmed: a pasted key or model name with a trailing space/newline breaks the request.
function apiKey(): string {
  return process.env.GROQ_API_KEY?.trim() ?? "";
}

export function groqEnabled(): boolean {
  return Boolean(apiKey());
}

export function groqModel(): string {
  return process.env.GROQ_MODEL?.trim() || DEFAULT_MODEL;
}

type GroqResponse = { choices?: { message?: { content?: string } }[] };

// Thinking wastes output tokens and seconds on an extraction task. Some models reject the
// parameter: then we stop sending it (per instance).
let reasoningParamSupported = true;

function send(prompt: string, imageBase64: string, mimeType: string, timeoutMs: number): Promise<Response> {
  return fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey()}` },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      model: groqModel(),
      temperature: 0,
      max_completion_tokens: MAX_OUTPUT_TOKENS,
      ...(reasoningParamSupported ? { reasoning_effort: "none" } : {}),
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          ],
        },
      ],
    }),
  });
}

/** Groq's `retry-after` header (seconds) → ms; 2 s when missing. */
function retryAfterMs(res: Response): number {
  const seconds = Number(res.headers.get("retry-after"));
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds * 1000) : 2_000;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Throws ProviderError (network/HTTP) or InvalidModelOutput (bad JSON, worth one retry). */
export async function extractWithGroq(
  imageBase64: string, mimeType: string, retry = false, lang: Lang = "ar",
): Promise<ModelExtraction> {
  if (!groqEnabled()) throw new ProviderError("groq disabled");
  const prompt = `${retry ? RETRY_INSTRUCTION : USER_INSTRUCTION}${OUTPUT_LANGUAGE_NOTE[lang]}\nSchema:\n${JSON.stringify(MODEL_JSON_SCHEMA)}`;
  const started = Date.now();
  const timeLeft = () => BUDGET_MS - (Date.now() - started);

  let rateLimitRetried = false;
  for (;;) {
    let res: Response;
    try {
      res = await send(prompt, imageBase64, mimeType, Math.max(1_000, timeLeft()));
    } catch (e) {
      throw new ProviderError(`groq ${e instanceof Error ? `${e.name}: ${e.message}` : "error"}`);
    }
    if (res.ok) {
      const data = (await res.json().catch(() => ({}))) as GroqResponse;
      return parseModelOutput(data.choices?.[0]?.message?.content);
    }

    const detail = await providerErrorDetail(res);
    if (res.status === 400 && reasoningParamSupported && /reasoning/i.test(detail)) {
      reasoningParamSupported = false; // model doesn't take reasoning_effort: resend without it
      continue;
    }
    if (res.status === 429 && !rateLimitRetried) {
      const wait = retryAfterMs(res);
      if (wait <= MAX_RETRY_WAIT_MS && timeLeft() - wait > 4_000) {
        rateLimitRetried = true;
        await sleep(wait);
        continue;
      }
    }
    throw new ProviderError(`groq http ${res.status}: ${detail} (model ${groqModel()})`);
  }
}
