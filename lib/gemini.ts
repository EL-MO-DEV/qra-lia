// Primary provider: Google Gemini (vision + structured JSON output) via the REST API.
// Ported from @SanaaOua's backend (ma.qralia.ai.GeminiVisionClient).
import { RETRY_INSTRUCTION, SYSTEM_PROMPT, USER_INSTRUCTION } from "./prompt";
import { MODEL_JSON_SCHEMA, ProviderError, parseModelOutput, type ModelExtraction } from "./schema";

const TIMEOUT_MS = 15_000;
const DEFAULT_MODEL = "gemini-2.5-flash";

export function geminiEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function geminiModel(): string {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
};

async function call(imageBase64: string, mimeType: string, retry: boolean, withSchema: boolean): Promise<Response> {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel())}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
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
          ...(withSchema ? { responseJsonSchema: MODEL_JSON_SCHEMA } : {}),
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
    // Some models/versions reject responseJsonSchema: retry once with plain JSON mode (zod still validates).
    if (res.status === 400) res = await call(imageBase64, mimeType, retry, false);
  } catch (e) {
    throw new ProviderError(`gemini ${e instanceof Error ? e.name : "error"}`);
  }
  if (!res.ok) throw new ProviderError(`gemini http ${res.status}`);

  const data = (await res.json().catch(() => ({}))) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("");
  return parseModelOutput(text);
}
