// Fallback provider: Groq (OpenAI-compatible chat completions with a vision model).
// Ported from @SanaaOua's backend (ma.qralia.ai.GroqVisionClient).
import { RETRY_INSTRUCTION, SYSTEM_PROMPT, USER_INSTRUCTION } from "./prompt";
import { MODEL_JSON_SCHEMA, ProviderError, parseModelOutput, providerErrorDetail, type ModelExtraction } from "./schema";

const TIMEOUT_MS = 12_000; // Gemini budget (16 s) + Groq stays under the app's 30 s timeout
const DEFAULT_MODEL = "qwen/qwen3.6-27b";

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

/** Throws ProviderError (network/HTTP) or InvalidModelOutput (bad JSON, worth one retry). */
export async function extractWithGroq(imageBase64: string, mimeType: string, retry = false): Promise<ModelExtraction> {
  if (!groqEnabled()) throw new ProviderError("groq disabled");
  const prompt = `${retry ? RETRY_INSTRUCTION : USER_INSTRUCTION}\nSchema:\n${JSON.stringify(MODEL_JSON_SCHEMA)}`;

  let res: Response;
  try {
    res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey()}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        model: groqModel(),
        temperature: 0,
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
  } catch (e) {
    throw new ProviderError(`groq ${e instanceof Error ? `${e.name}: ${e.message}` : "error"}`);
  }
  if (!res.ok) throw new ProviderError(`groq http ${res.status}: ${await providerErrorDetail(res)} (model ${groqModel()})`);

  const data = (await res.json().catch(() => ({}))) as GroqResponse;
  return parseModelOutput(data.choices?.[0]?.message?.content);
}
