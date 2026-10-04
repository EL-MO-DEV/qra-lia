// Follow-up questions about a paper that was already read ("can I pay at the bank?").
// The model only gets the extracted fields (never the photo) and must answer from them.
import type { Lang } from "./types";

export type PaperContext = {
  doc_type?: string | null;
  sender?: string | null;
  amount?: { value: number; currency: string } | null;
  deadline?: string | null;
  days_left?: number | null;
  action?: string | null;
  risk_level?: string;
  risk_reasons?: string[];
  scam_suspected?: boolean;
  darija_summary?: string;
};

const FIELDS: (keyof PaperContext)[] = [
  "doc_type", "sender", "amount", "deadline", "days_left", "action", "risk_level", "risk_reasons", "scam_suspected", "darija_summary",
];

/** Keep only known fields, so nothing else from the caller reaches the prompt. */
export function cleanContext(raw: unknown): PaperContext | null {
  if (!raw || typeof raw !== "object") return null;
  const out: Record<string, unknown> = {};
  for (const k of FIELDS) {
    const v = (raw as Record<string, unknown>)[k];
    if (v !== undefined) out[k] = v;
  }
  return JSON.stringify(out).length <= 4000 ? (out as PaperContext) : null;
}

const SYSTEM: Record<Lang, string> = {
  ar: [
    "نتا Qra Lia، مساعد كيشرح الأوراق للناس اللي ما كيقراوش.",
    "جاوب على السؤال بالدارجة المغربية بالحروف العربية، فـ 3 جمل قصار على الأكثر، بكلمات ساهلة.",
    "استعمل غير المعلومات ديال الورقة اللي عطيناك. إلا الجواب ماشي فيها، قول بصراحة أن الورقة ما فيهاش هاد المعلومة، ونصح يسول الجهة اللي صيفطات الورقة (فالوكالة ولا فالنمرة الرسمية) ولا شي حد تيق فيه.",
    "عمرك ما تخترع مبلغ، تاريخ، نمرة تيليفون ولا رابط. عمرك ما تطلب ولا تشجع على إعطاء كود، كلمة سر ولا نمرة الكارط.",
  ].join("\n"),
  en: [
    "You are Qra Lia, an assistant that explains paperwork to people who can't read it.",
    "Answer the question in simple English, at most 3 short sentences.",
    "Use only the paper facts provided. If the answer isn't there, say so honestly and suggest asking the sender (at their agency or official number) or someone they trust.",
    "Never invent amounts, dates, phone numbers or links. Never ask for or encourage sharing codes, passwords or card numbers.",
  ].join("\n"),
};

const userPrompt = (question: string, context: PaperContext) =>
  `Paper facts (JSON):\n${JSON.stringify(context)}\n\nQuestion:\n${question}`;

const env = (k: string) => process.env[k]?.trim() ?? "";

async function askGemini(question: string, context: PaperContext, lang: Lang): Promise<string> {
  const key = env("GEMINI_API_KEY");
  if (!key) throw new Error("gemini disabled");
  const model = (env("GEMINI_MODEL") || "gemini-3.8-flash").split(",")[0].trim();
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    signal: AbortSignal.timeout(12_000),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM[lang] }] },
      contents: [{ role: "user", parts: [{ text: userPrompt(question, context) }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 400,
        ...(model.includes("flash") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
      },
    }),
  });
  if (!res.ok) throw new Error(`gemini http ${res.status}`);
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] };
  const text = data.candidates?.[0]?.content?.parts?.filter((p) => !p.thought).map((p) => p.text ?? "").join("").trim();
  if (!text) throw new Error("gemini empty");
  return text;
}

let groqReasoningParam = true;

async function askGroq(question: string, context: PaperContext, lang: Lang): Promise<string> {
  const key = env("GROQ_API_KEY");
  if (!key) throw new Error("groq disabled");
  for (;;) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(12_000),
      body: JSON.stringify({
        model: env("GROQ_MODEL") || "qwen/qwen3.8-27b",
        temperature: 0.2,
        max_completion_tokens: 400,
        ...(groqReasoningParam ? { reasoning_effort: "none" } : {}),
        messages: [
          { role: "system", content: SYSTEM[lang] },
          { role: "user", content: userPrompt(question, context) },
        ],
      }),
    });
    if (res.status === 400 && groqReasoningParam && /reasoning/i.test(await res.clone().text())) {
      groqReasoningParam = false;
      continue;
    }
    if (!res.ok) throw new Error(`groq http ${res.status}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = (data.choices?.[0]?.message?.content ?? "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    if (!text) throw new Error("groq empty");
    return text;
  }
}

/** Gemini first, Groq as fallback. Throws when both fail. */
export async function answerQuestion(question: string, context: PaperContext, lang: Lang): Promise<{ answer: string; provider: "gemini" | "groq" }> {
  try {
    return { answer: await askGemini(question, context, lang), provider: "gemini" };
  } catch (geminiError) {
    try {
      return { answer: await askGroq(question, context, lang), provider: "groq" };
    } catch (groqError) {
      throw new Error(`${geminiError instanceof Error ? geminiError.message : "gemini"} | ${groqError instanceof Error ? groqError.message : "groq"}`);
    }
  }
}
