// "Show me where": find where the amount, deadline and sender are printed on the photo,
// so people can check the AI's answer with their own eyes. Returns boxes as fractions of the image.
export const LOCATE_FIELDS = ["amount", "deadline", "sender"] as const;
export type LocateField = (typeof LOCATE_FIELDS)[number];
export type LocateTargets = Partial<Record<LocateField, string>>;
/** x, y, w, h as fractions (0..1) of the image width/height, origin top-left. */
export type LocatedBox = { field: LocateField; x: number; y: number; w: number; h: number };

const env = (k: string) => process.env[k]?.trim() ?? "";

/** Keep only known fields with short string values. */
export function cleanTargets(raw: unknown): LocateTargets | null {
  if (!raw || typeof raw !== "object") return null;
  const out: LocateTargets = {};
  for (const f of LOCATE_FIELDS) {
    const v = (raw as Record<string, unknown>)[f];
    if (typeof v === "string" && v.trim() && v.length <= 120) out[f] = v.trim();
  }
  return Object.keys(out).length ? out : null;
}

const HINTS: Record<LocateField, (v: string) => string> = {
  amount: (v) => `- amount: the amount to pay, ${v} (look for the number itself, e.g. "${v.split(" ")[0]}")`,
  deadline: (v) =>
    `- deadline: the payment deadline / due date, ${v} (it may be printed differently, e.g. dd/mm/yyyy, dd-mm-yy, or with the month written in French or Arabic)`,
  sender: (v) => `- sender: the organisation that sent the document, "${v}" (its printed name or logo)`,
};

export function locatePrompt(targets: LocateTargets): string {
  const lines = LOCATE_FIELDS.filter((f) => targets[f]).map((f) => HINTS[f](targets[f]!));
  return [
    "You locate printed information on a photo of a paper document.",
    "For each target below, find where it is printed on the image and return its bounding box.",
    "Targets:",
    ...lines,
    'Return only JSON: {"items":[{"field":"amount","box_2d":[ymin,xmin,ymax,xmax]}]}',
    "Coordinates are integers normalized to 0-1000, origin at the top-left of the image.",
    "Include a field only if you can actually see it printed. Never guess. One tight box per field, around the value itself (not the whole line, table or page).",
  ].join("\n");
}

/** Model output → validated boxes. Accepts 0-1000 boxes, or pixel boxes when the image size is known. */
export function parseBoxes(raw: string | undefined, width?: number, height?: number): LocatedBox[] {
  if (!raw) return [];
  let text = raw.replace(/<think>[\s\S]*?<\/think>/gi, "");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return [];
  text = text.slice(start, end + 1);
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return [];
  }
  const items = (data as { items?: unknown })?.items;
  if (!Array.isArray(items)) return [];

  const seen = new Set<LocateField>();
  const out: LocatedBox[] = [];
  for (const item of items) {
    const field = (item as { field?: unknown })?.field;
    const box = (item as { box_2d?: unknown })?.box_2d;
    if (!LOCATE_FIELDS.includes(field as LocateField) || seen.has(field as LocateField)) continue;
    if (!Array.isArray(box) || box.length !== 4 || !box.every((n) => typeof n === "number" && Number.isFinite(n))) continue;
    let [ymin, xmin, ymax, xmax] = box as number[];
    if (Math.max(ymin, xmin, ymax, xmax) <= 1000) {
      [ymin, xmin, ymax, xmax] = [ymin / 1000, xmin / 1000, ymax / 1000, xmax / 1000];
    } else if (width && height) {
      [ymin, xmin, ymax, xmax] = [ymin / height, xmin / width, ymax / height, xmax / width];
    } else continue;
    const x = Math.max(0, Math.min(xmin, xmax));
    const y = Math.max(0, Math.min(ymin, ymax));
    const w = Math.min(1, Math.max(xmin, xmax)) - x;
    const h = Math.min(1, Math.max(ymin, ymax)) - y;
    // Too small to be real, or so big it points at nothing in particular.
    if (w < 0.004 || h < 0.004 || w * h > 0.35) continue;
    seen.add(field as LocateField);
    out.push({ field: field as LocateField, x, y, w, h });
  }
  return out;
}

async function locateGemini(imageBase64: string, mimeType: string, prompt: string): Promise<string> {
  const key = env("GEMINI_API_KEY");
  if (!key) throw new Error("gemini disabled");
  const model = (env("GEMINI_MODEL") || "gemini-3.8-flash").split(",")[0].trim();
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType, data: imageBase64 } }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        maxOutputTokens: 400,
        ...(model.includes("flash") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
      },
    }),
  });
  if (!res.ok) throw new Error(`gemini http ${res.status}`);
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] };
  return data.candidates?.[0]?.content?.parts?.filter((p) => !p.thought).map((p) => p.text ?? "").join("") ?? "";
}

let groqReasoningParam = true;

async function locateGroq(imageBase64: string, mimeType: string, prompt: string): Promise<string> {
  const key = env("GROQ_API_KEY");
  if (!key) throw new Error("groq disabled");
  for (;;) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        model: env("GROQ_MODEL") || "qwen/qwen3.8-27b",
        temperature: 0,
        max_completion_tokens: 400,
        ...(groqReasoningParam ? { reasoning_effort: "none" } : {}),
        response_format: { type: "json_object" },
        messages: [
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
    if (res.status === 400 && groqReasoningParam && /reasoning/i.test(await res.clone().text())) {
      groqReasoningParam = false;
      continue;
    }
    if (!res.ok) throw new Error(`groq http ${res.status}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content ?? "";
  }
}

/** Gemini first (best at boxes), Groq as fallback. Throws only when both providers fail. */
export async function locateFields(
  imageBase64: string,
  mimeType: string,
  targets: LocateTargets,
  size?: { width?: number; height?: number },
): Promise<{ boxes: LocatedBox[]; provider: "gemini" | "groq" }> {
  const prompt = locatePrompt(targets);
  try {
    return { boxes: parseBoxes(await locateGemini(imageBase64, mimeType, prompt), size?.width, size?.height), provider: "gemini" };
  } catch (geminiError) {
    try {
      return { boxes: parseBoxes(await locateGroq(imageBase64, mimeType, prompt), size?.width, size?.height), provider: "groq" };
    } catch (groqError) {
      throw new Error(`${geminiError instanceof Error ? geminiError.message : "gemini"} | ${groqError instanceof Error ? groqError.message : "groq"}`);
    }
  }
}
