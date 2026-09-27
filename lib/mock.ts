import type { ReadResult } from "./types";

export const MOCK_OK: ReadResult = {
  status: "ok",
  doc_type: "فاتورة الضو والما",
  sender: "ONEE",
  amount: { value: 340, currency: "MAD" },
  deadline: "2026-10-15",
  days_left: 18,
  action: "خلّص قبل 15 أكتوبر فالوكالة ولا فالتطبيق",
  risk_level: "medium",
  risk_reasons: ["إلا ما خلّصتيش يقدرو يزيدو غرامة"],
  scam_suspected: false,
  confidence: 0.92,
  darija_summary: "هادي فاتورة ديال الضو والما من ONEE. خاصك تخلّص 340 درهم قبل 15 أكتوبر. تقدر تخلّص فالوكالة ولا فالتطبيق. إلا تعطلتي يقدرو يزيدو غرامة.",
  provider: "gemini",
  latency_ms: 3800,
};

export const MOCK_UNREADABLE: ReadResult = {
  ...MOCK_OK, status: "unreadable", doc_type: null, sender: null, amount: null,
  deadline: null, days_left: null, action: null, risk_level: "low", risk_reasons: [],
  confidence: 0, darija_summary: "الصورة ما واضحاش. عاود صوّر فضو مزيان وبلا ما تحرك التيليفون.",
};

export const MOCK_SCAM: ReadResult = {
  ...MOCK_OK, doc_type: "رسالة ديال ربح", sender: null, amount: { value: 10000, currency: "MAD" },
  deadline: null, days_left: null, action: "ما تصيفط حتى معلومة وما تكليكيش على الرابط",
  risk_level: "high", scam_suspected: true,
  risk_reasons: ["كيطلبو الكود ديال الكارط", "رابط مشكوك فيه"],
  darija_summary: "رد البال! هاد الرسالة فيها علامات ديال النصب. كيطلبو منك الكود ديال الكارط. ما تصيفط والو وسول شي حد تيق فيه.",
};
