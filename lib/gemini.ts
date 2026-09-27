// Primary provider: Google Gemini (vision + structured JSON output) via the REST API.
// Ported from @SanaaOua's backend (ma.qralia.ai.GeminiVisionClient).
import { OUTPUT_LANGUAGE_NOTE } from "./lang";
import { RETRY_INSTRUCTION, SYSTEM_PROMPT, USER_INSTRUCTION } from "./prompt";
import type { Lang } from "./types";
import { MODEL_JSON_SCHEMA, ProviderError, parseModelOutput, providerErrorDetail, type ModelExtraction } from "./schema";

const TIMEOUT_MS = 15_000;
// Whole Gemini budget (all models and retries), so Gemini + Groq stay under the app's 30 s timeout.
const BUDGET_MS = 16_000;
// "High demand" / rate limit / transient errors: retry the same model after a short pause.
const RETRY_STATUSES = [429, 500, 503];
const BACKOFF_MS = [700, 1500];
const DEFAULT_MODEL = "gemini-3.8-flash";

// Trimmed: a pasted key or model name with a trailing space/newline breaks the request.
function apiKey(): string {
  return process.env.GEMINI_API_KEY?.trim() ?? "";
}

export function geminiEnabled(): boolean {
  return Boolean(apiKey());
}

/** GEMINI_MODEL may list backups, tried in order: "gemini-3.8-flash,other-model". */
export function geminiModels(): string[] {
  const models = (process.env.GEMINI_MODEL ?? "").split(",").map((m) => m.trim()).filter(Boolean);
  return models.length ? models : [DEFAULT_MODEL];
}

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
};

async function call(
  model: string, imageBase64: string, mimeType: string, retry: boolean, extras: boolean, timeoutMs: number, lang: Lang,
): Promise<Response> {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey() },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          {
            role: "user",
            parts: [
              { text: (retry ? RETRY_INSTRUCTION : USER_INSTRUCTION) + OUTPUT_LANGUAGE_NOTE[lang] },
              { inlineData: { mimeType, data: imageBase64 } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          ...(extras
            ? {
                responseJsonSchema: MODEL_JSON_SCHEMA,
                // Extraction doesn't need "thinking": turning it off on Flash cuts latency to a few seconds.
                ...(model.includes("flash") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
              }
            : {}),
        },
      }),
    },
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Quota exhausted (429 RESOURCE_EXHAUSTED "exceeded your current quota"): retrying only burns
// seconds before the Groq fallback. Skip Gemini on this instance for a while instead.
const QUOTA_COOLDOWN_MS = 5 * 60_000;
let quotaCooldownUntil = 0;

/** Throws ProviderError (network/HTTP) or InvalidModelOutput (bad JSON, worth one retry). */
export async function extractWithGemini(
  imageBase64: string, mimeType: string, retry = false, lang: Lang = "ar",
): Promise<ModelExtraction> {
  if (!geminiEnabled()) throw new ProviderError("gemini disabled");
  if (Date.now() < quotaCooldownUntil) throw new ProviderError("gemini skipped: quota exhausted recently");
  const started = Date.now();
  const timeLeft = () => BUDGET_MS - (Date.now() - started);
  let lastError = "no attempt";

  for (const model of geminiModels()) {
    for (let attempt = 0; attempt <= BACKOFF_MS.length; attempt++) {
      if (timeLeft() < 2_000) throw new ProviderError(`gemini out of time, last: ${lastError}`);
      let res: Response;
      try {
        res = await call(model, imageBase64, mimeType, retry, true, Math.min(TIMEOUT_MS, timeLeft()), lang);
        // Some models reject responseJsonSchema or thinkingConfig: retry once in plain JSON mode (zod still validates).
        if (res.status === 400) res = await call(model, imageBase64, mimeType, retry, false, Math.max(1_000, Math.min(TIMEOUT_MS, timeLeft())), lang);
      } catch (e) {
        // Timeout / network: don't hammer the same model, move on.
        lastError = `${e instanceof Error ? `${e.name}: ${e.message}` : "error"} (model ${model})`;
        break;
      }

      if (res.ok) {
        quotaCooldownUntil = 0; // a backup model still has quota: keep using Gemini
        const data = (await res.json().catch(() => ({}))) as GeminiResponse;
        const text = data.candidates?.[0]?.content?.parts
          ?.filter((p) => !p.thought)
          .map((p) => p.text ?? "")
          .join("");
        return parseModelOutput(text);
      }

      const detail = await providerErrorDetail(res);
      lastError = `http ${res.status}: ${detail} (model ${model})`;
      if (res.status === 429 && /quota/i.test(detail)) {
        quotaCooldownUntil = Date.now() + QUOTA_COOLDOWN_MS;
        break; // backup models have their own quota: try them now, skip Gemini on later requests
      }
      if (!RETRY_STATUSES.includes(res.status)) break; // 404, 403…: next model
      if (attempt < BACKOFF_MS.length) await sleep(BACKOFF_MS[attempt]);
    }
  }
  throw new ProviderError(`gemini ${lastError}`);
}
