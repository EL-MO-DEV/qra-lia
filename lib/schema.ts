// Model output schema: JSON Schema sent to the model + zod validation of what comes back.
// Ported from @SanaaOua's backend (SystemPrompt.JSON_SCHEMA + ExtractionParser).
import { z } from "zod";

/** What the model must return (no days_left / provider / latency_ms — the server adds those). */
export const MODEL_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "status", "doc_type", "sender", "amount", "deadline", "action",
    "risk_level", "risk_reasons", "scam_suspected", "confidence", "darija_summary",
  ],
  properties: {
    status: { type: "string", enum: ["ok", "unreadable", "not_a_document"] },
    doc_type: { type: ["string", "null"] },
    sender: { type: ["string", "null"] },
    amount: {
      type: ["object", "null"],
      properties: { value: { type: "number" }, currency: { type: "string" } },
    },
    deadline: { type: ["string", "null"], description: "ISO date YYYY-MM-DD" },
    action: { type: ["string", "null"] },
    risk_level: { type: "string", enum: ["low", "medium", "high"] },
    risk_reasons: { type: "array", items: { type: "string" } },
    scam_suspected: { type: "boolean" },
    confidence: { type: "number" },
    darija_summary: { type: "string" },
  },
} as const;

const nullableText = z
  .string()
  .nullish()
  .transform((s) => (s && s.trim() ? s.trim() : null));

export const ModelExtractionSchema = z.object({
  status: z.enum(["ok", "unreadable", "not_a_document"]),
  doc_type: nullableText,
  sender: nullableText,
  amount: z
    .object({ value: z.number().finite(), currency: z.string().nullish() })
    .nullish()
    .transform((a) => (a ? { value: a.value, currency: a.currency?.trim() || "MAD" } : null)),
  // A deadline that is not a real ISO date is dropped rather than guessed.
  deadline: z
    .string()
    .nullish()
    .transform((d) => {
      const iso = d?.trim().slice(0, 10) ?? "";
      return /^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(Date.parse(iso)) ? iso : null;
    }),
  action: nullableText,
  risk_level: z.enum(["low", "medium", "high"]).catch("low"),
  risk_reasons: z.array(z.string()).nullish().transform((r) => (r ?? []).filter((s) => s.trim())),
  scam_suspected: z.boolean().nullish().transform((b) => b === true),
  confidence: z.number().nullish().transform((c) => Math.min(1, Math.max(0, c ?? 0))),
  darija_summary: z.string().trim().min(1),
});

export type ModelExtraction = z.infer<typeof ModelExtractionSchema>;

/** Strip ```json fences / surrounding prose, then validate. Throws InvalidModelOutput. */
export function parseModelOutput(raw: string | null | undefined): ModelExtraction {
  if (!raw || !raw.trim()) throw new InvalidModelOutput("empty model output");
  // Reasoning models (e.g. Qwen on Groq) may prepend <think>…</think>; it can contain braces.
  let json = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const fenced = /^```(?:json)?\s*\n([\s\S]*?)```/.exec(json);
  if (fenced) json = fenced[1].trim();
  const start = json.indexOf("{");
  const end = json.lastIndexOf("}");
  if (start >= 0 && end > start) json = json.slice(start, end + 1);

  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new InvalidModelOutput("not json");
  }
  const parsed = ModelExtractionSchema.safeParse(data);
  if (!parsed.success) throw new InvalidModelOutput("schema mismatch");
  return parsed.data;
}

/** The model answered, but not with valid JSON for our schema (worth one retry). */
export class InvalidModelOutput extends Error {}

/** The provider call itself failed (timeout, HTTP error, missing key). */
export class ProviderError extends Error {}

/**
 * Short, loggable reason from a provider error body, e.g. "API key not valid" or "model not found".
 * Provider error messages describe the request/config, never the document content.
 */
export async function providerErrorDetail(res: Response): Promise<string> {
  const raw = await res.text().catch(() => "");
  let message = raw;
  try {
    const body = JSON.parse(raw) as { error?: { message?: string; status?: string } | string };
    message = typeof body.error === "string" ? body.error : [body.error?.status, body.error?.message].filter(Boolean).join(" ");
  } catch {
    // not JSON: keep the raw text
  }
  return message.replace(/\s+/g, " ").trim().slice(0, 200) || "no details";
}
