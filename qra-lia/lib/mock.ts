// OWNED BY MONCEF — do not edit. Reproduced here only so this package compiles standalone.
// If you need a change, ask in the group.

import type { ReadResult } from "./types";

export const MOCK_OK: ReadResult = {
  status: "ok",
  doc_type: "فاتورة الماء",
  sender: "الوكالة المستقلة للماء والكهرباء",
  amount: { value: 340, currency: "MAD" },
  deadline: "2026-10-15",
  days_left: 18,
  action: "خلص الفاتورة قبل 15 أكتوبر باش ما يقطعوش عليك الماء.",
  risk_level: "low",
  risk_reasons: [],
  scam_suspected: false,
  confidence: 0.92,
  darija_summary:
    "هاد الورقة هي فاتورة ديال الماء ديال الشهر لي فات. خاصك تخلص 340 درهم قبل 15 أكتوبر. إلا ما خلصتيش فالوقت، يمكن يقطعوا عليك الماء.",
  provider: "gemini",
  latency_ms: 1450,
};

export const MOCK_UNREADABLE: ReadResult = {
  status: "unreadable",
  doc_type: null,
  sender: null,
  amount: null,
  deadline: null,
  days_left: null,
  action: null,
  risk_level: "low",
  risk_reasons: [],
  scam_suspected: false,
  confidence: 0,
  darija_summary: "",
  provider: "groq",
  latency_ms: 800,
};

export const MOCK_SCAM: ReadResult = {
  status: "ok",
  doc_type: "رسالة إلكترونية",
  sender: "مجهول",
  amount: { value: 5000, currency: "MAD" },
  deadline: "2026-09-29",
  days_left: 2,
  action: "ما تخلصش ولا تعطي رقم البطاقة ديالك. تأكد مع شي حد تيق فيه أولا.",
  risk_level: "high",
  risk_reasons: [
    "كيطلبو منك تخلص بسرعة بزاف",
    "ما كاينش رقم رسمي ديال المرسل",
    "كيطلبو معلومات بنكية حساسة",
  ],
  scam_suspected: true,
  confidence: 0.55,
  darija_summary:
    "هاد الرسالة كتقول بلي خاصك تخلص 5000 درهم فأقرب وقت باش ما يوقفوش شي خدمة ديالك، وكتطلب رقم البطاقة البنكية ديالك مباشرة. هاد الطريقة فيها علامات ديال النصب.",
  provider: "gemini",
  latency_ms: 1200,
};
