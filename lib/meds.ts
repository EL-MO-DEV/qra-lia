// 💊 Medicines: read a prescription (ordonnance) or a medicine box and turn it into a simple daily schedule.
// Safety first: the model may only copy what is printed/handwritten. Unclear → null + "ask the pharmacist".
import { z } from "zod";
import type { Lang } from "./types";
import { SLOTS, type MedsResult } from "./medsSchedule";

const nullableText = z
  .string()
  .nullish()
  .transform((s) => (s && s.trim() ? s.trim().slice(0, 160) : null));

const MedicineSchema = z.object({
  name: z.string().trim().min(1).transform((n) => n.slice(0, 120)),
  dose: nullableText, // exactly as written, e.g. "1 comprimé", "5 ml"
  slots: z
    .array(z.string())
    .nullish()
    .transform((s) => [...new Set((s ?? []).filter((x): x is (typeof SLOTS)[number] => (SLOTS as readonly string[]).includes(x)))]),
  food: z.enum(["before", "after", "with"]).nullish().catch(null).transform((v) => v ?? null),
  duration_days: z.number().int().min(1).max(365).nullish().catch(null).transform((v) => v ?? null),
  note: nullableText,
});

export const MedsSchema = z.object({
  status: z.enum(["ok", "unreadable", "not_medical"]),
  kind: z.enum(["prescription", "medicine_box", "leaflet", "other"]).catch("other"),
  // One bad entry must not wipe out the others: keep every medicine that validates (max 15).
  medicines: z
    .array(z.unknown())
    .catch([])
    .transform((items) =>
      items
        .map((x) => MedicineSchema.safeParse(x))
        .flatMap((r) => (r.success ? [r.data] : []))
        .slice(0, 15),
    ),
  warnings: z.array(z.string()).max(5).catch([]).transform((w) => w.map((s) => s.trim()).filter(Boolean)),
  confidence: z.number().nullish().transform((c) => Math.min(1, Math.max(0, c ?? 0))),
  summary: z.string().trim().min(1).max(1500),
});

const JSON_SHAPE = `{
  "status": "ok" | "unreadable" | "not_medical",
  "kind": "prescription" | "medicine_box" | "leaflet" | "other",
  "medicines": [{
    "name": "medicine name exactly as written (brand + strength if shown, e.g. Doliprane 1000 mg)",
    "dose": "quantity per intake exactly as written (e.g. 1 comprimé, 2 gélules, 5 ml) or null",
    "slots": ["morning" | "noon" | "evening" | "night"],
    "food": "before" | "after" | "with" | null,
    "duration_days": number | null,
    "note": "other instruction exactly as written (e.g. si douleur, ne pas dépasser 3/jour) or null"
  }],
  "warnings": ["short warning printed on the document, if any"],
  "confidence": 0..1,
  "summary": "simple explanation for the patient"
}`;

const SYSTEM = `You read medical prescriptions (ordonnances) and medicine packages for people in Morocco who cannot read.
SAFETY RULES (most important):
- Copy ONLY what is printed or handwritten. Never infer a dose from the medicine name. Never add medicines, doses, times or durations that are not written.
- If something is unclear (handwriting, cut off), set that field to null and say in the summary to ask the pharmacist.
- Never give medical advice beyond what is written. Never tell the person to stop, start or change a medicine.
- Do not output the patient's or doctor's name, address, phone or ID numbers.
TIMES ("slots"):
- "le matin" → morning; "midi" → noon; "le soir" → evening; "au coucher" → night.
- "1 fois par jour" with no time → ["morning"]; "2 fois par jour" → ["morning","evening"]; "3 fois par jour" → ["morning","noon","evening"]; "4 fois" → all four. Mention in "note" that the times are the usual spread if the document gives no times.
- "si besoin / si douleur" → slots [] and keep it in "note".
FOOD: "avant le repas" → before, "après le repas" → after, "pendant le repas" → with.
DURATION: "pendant 7 jours" → 7; "1 mois" → 30; boxes/packets count alone is NOT a duration.
status: "unreadable" if the photo is too blurry/dark; "not_medical" if it is not a prescription, medicine box or leaflet.
Return ONLY JSON with this shape:
${JSON_SHAPE}`;

const SUMMARY_LANG: Record<Lang, string> = {
  ar: `"summary": Moroccan Darija in Arabic script, very simple, one short sentence per medicine (name, how much, when, before/after food, how many days), then end with: "تأكد ديما مع الصيدلي ولا الطبيب، وما تبدلش الدوا بوحدك."`,
  en: `"summary": simple English, one short sentence per medicine (name, how much, when, before/after food, how many days), then end with: "Always check with your pharmacist or doctor, and never change a medicine on your own."`,
};

const env = (k: string) => process.env[k]?.trim() ?? "";

/** Strip <think>, ``` fences and prose around the JSON, then validate. Throws on invalid output. */
export function parseMeds(raw: string | undefined) {
  if (!raw) throw new Error("empty");
  let text = raw.replace(/<think>[\s\S]*?<\/think>/gi, "");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("not json");
  text = text.slice(start, end + 1);
  const parsed = MedsSchema.safeParse(JSON.parse(text));
  if (!parsed.success) throw new Error("schema mismatch");
  return parsed.data;
}

async function viaGemini(imageBase64: string, mimeType: string, lang: Lang): Promise<string> {
  const key = env("GEMINI_API_KEY");
  if (!key) throw new Error("gemini disabled");
  const model = (env("GEMINI_MODEL") || "gemini-3.8-flash").split(",")[0].trim();
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    signal: AbortSignal.timeout(18_000),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: `Read this document. ${SUMMARY_LANG[lang]}` }, { inlineData: { mimeType, data: imageBase64 } }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        maxOutputTokens: 1500,
        ...(model.includes("flash") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
      },
    }),
  });
  if (!res.ok) throw new Error(`gemini http ${res.status}`);
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] };
  return data.candidates?.[0]?.content?.parts?.filter((p) => !p.thought).map((p) => p.text ?? "").join("") ?? "";
}

let groqReasoningParam = true;

async function viaGroq(imageBase64: string, mimeType: string, lang: Lang): Promise<string> {
  const key = env("GROQ_API_KEY");
  if (!key) throw new Error("groq disabled");
  for (;;) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(18_000),
      body: JSON.stringify({
        model: env("GROQ_MODEL") || "qwen/qwen3.8-27b",
        temperature: 0,
        max_completion_tokens: 900,
        ...(groqReasoningParam ? { reasoning_effort: "none" } : {}),
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: `Read this document. ${SUMMARY_LANG[lang]}` },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
            ],
          },
        ],
      }),
    });
    if (res.status === 400 && groqReasoningParam && /reasoning/i.test(await res.clone().text())) {
      groqReasoningParam = false;
      continue;
    }
    if (!res.ok) throw new Error(`groq http ${res.status}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content ?? "";
  }
}

/** Gemini first, Groq as fallback (also when Gemini answers with invalid JSON). */
export async function readMeds(imageBase64: string, mimeType: string, lang: Lang): Promise<MedsResult> {
  const started = Date.now();
  const errors: string[] = [];
  for (const [provider, call] of [["gemini", viaGemini], ["groq", viaGroq]] as const) {
    try {
      const data = parseMeds(await call(imageBase64, mimeType, lang));
      // Not OK → never pass on half-read medicines.
      const medicines = data.status === "ok" ? data.medicines : [];
      return { ...data, medicines, provider, latency_ms: Date.now() - started };
    } catch (e) {
      errors.push(`${provider}: ${e instanceof Error ? e.message : "error"}`);
    }
  }
  throw new Error(errors.join(" | "));
}
