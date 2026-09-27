// Primary provider: Google Gemini (vision + structured JSON output) via the REST API.
// Ported from @SanaaOua's backend (ma.qralia.ai.GeminiVisionClient).
import { RETRY_INSTRUCTION, SYSTEM_PROMPT, USER_INSTRUCTION } from "./prompt";
import { MODEL_JSON_SCHEMA, ProviderError, parseModelOutput, providerErrorDetail, type ModelExtraction } from "./schema";

const TIMEOUT_MS = 15_000;
const DEFAULT_MODEL = "gemini-2.5-flash";

// Trimmed: a pasted key or model name with a trailing space/newline breaks the request.
function apiKey(): string {
  return process.env.GEMINI_API_KEY?.trim() ?? "";
}

export function geminiEnabled(): boolean {
  return Boolean(apiKey());
}

export function geminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
};

async function call(imageBase64: string, mimeType: string, retry: boolean, extras: boolean): Promise<Response> {
  const model = geminiModel();
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey() },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          {
            role: "user",
            parts: [
              { text: retry ? RETRY_INSTRUCTION : USER_INSTRUCTION },
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

/** Throws ProviderError (network/HTTP) or InvalidModelOutput (bad JSON, worth one retry). */
export async function extractWithGemini(imageBase64: string, mimeType: string, retry = false): Promise<ModelExtraction> {
  if (!geminiEnabled()) throw new ProviderError("gemini disabled");
  let res: Response;
  try {
    res = await call(imageBase64, mimeType, retry, true);
    // Some models reject responseJsonSchema or thinkingConfig: retry once in plain JSON mode (zod still validates).
    if (res.status === 400) res = await call(imageBase64, mimeType, retry, false);
  } catch (e) {
    throw new ProviderError(`gemini ${e instanceof Error ? `${e.name}: ${e.message}` : "error"}`);
  }
  if (!res.ok) throw new ProviderError(`gemini http ${res.status}: ${await providerErrorDetail(res)} (model ${geminiModel()})`);

  const data = (await res.json().catch(() => ({}))) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts
    ?.filter((p) => !p.thought)
    .map((p) => p.text ?? "")
    .join("");
  return parseModelOutput(text);
}
