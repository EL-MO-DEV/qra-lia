"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { Lang } from "./types";

// Every UI string, in Darija (default) and English. French subtitles stay in the markup (shown in Darija mode only).
const STRINGS = {
  // top bar / global
  brandSub: { ar: "Qra Lia", en: "اقرا ليا" },
  brandName: { ar: "اقرا ليا", en: "Qra Lia" },
  homeLabel: { ar: "Qra Lia — الرئيسية", en: "Qra Lia — Home" },
  noSignup: { ar: "🔒 بلا تسجيل", en: "🔒 No sign-up" },
  newPaper: { ar: "ورقة جديدة", en: "New paper" },
  switchTo: { ar: "EN", en: "دارجة" },
  switchLabel: { ar: "Switch to English", en: "بدّل للدارجة" },
  demo: { ar: "🧪 DEMO — نتيجة تجريبية، ماشي قراية حقيقية", en: "🧪 DEMO — sample result, not a real reading" },

  // upload
  takePhoto: { ar: "صوّر الورقة", en: "Take a photo" },
  fromGallery: { ar: "ولا اختار من الصور", en: "or choose from gallery" },
  notStored: { ar: "الصورة ما كتحفظش عندنا", en: "Your photo is never stored" },

  // landing
  listenIntro: { ar: "سمع شنو هو هاد التطبيق", en: "Listen: what is this app?" },
  eyebrow: { ar: "مساعد ذكي للأوراق ديالك", en: "Your AI helper for paperwork" },
  heroA: { ar: "صوّر أي ورقة، ", en: "Photograph any paper, " },
  heroHl: { ar: "نشرحوها ليك", en: "we explain it" },
  heroB: { ar: " بالدارجة", en: " in plain words" },
  heroSub: {
    ar: "فاتورة، رسالة ديال البنكة ولا الإدارة: نقولو ليك شنو فيها، شحال خاصك تخلّص، وفوقاش.",
    en: "Bills, bank or government letters: we tell you what it says, how much to pay, and by when — in Moroccan Darija or English, written and read aloud.",
  },
  chipVoice: { ar: "🔊 بالصوت", en: "🔊 Read aloud" },
  chipFast: { ar: "⚡ فثواني", en: "⚡ In seconds" },
  chipScam: { ar: "🛡️ كنكشفو النصب", en: "🛡️ Scam alerts" },
  howKicker: { ar: "كيفاش كتخدم", en: "How it works" },
  howTitle: { ar: "3 خطوات وصافي", en: "3 simple steps" },
  step1T: { ar: "صوّر الورقة", en: "Snap the paper" },
  step1: { ar: "فاتورة، رسالة ديال البنكة، CNSS، الإدارة…", en: "Utility bill, bank letter, CNSS, administration…" },
  step2T: { ar: "كنقراوها ليك", en: "We read it" },
  step2: { ar: "الذكاء الاصطناعي كيفهم الفرنسية والعربية فثواني", en: "AI understands French and Arabic in seconds" },
  step3T: { ar: "سمع وفهم بالدارجة", en: "Listen and understand" },
  step3: { ar: "شنو هي، شحال، فوقاش، وشنو خاصك دير", en: "What it is, how much, by when, and what to do" },
  statText: {
    ar: "واحد من كل 4 ديال المغاربة ما كيعرفش يقرا، والأوراق الرسمية كتجي بالفرنسية ولا بالعربية الفصحى.",
    en: "1 in 4 Moroccans cannot read — and official papers arrive in French or Modern Standard Arabic.",
  },
  whatKicker: { ar: "شنو كتاخد", en: "What you get" },
  whatTitle: { ar: "كلشي واضح، بخط كبير", en: "Everything clear, in big letters" },
  f1T: { ar: "شحال وفوقاش", en: "How much & when" },
  f1: { ar: "المبلغ والأجل بخط كبير، وشحال بقا ليك من يوم", en: "Amount and deadline in large text, with days left" },
  f2T: { ar: "شنو خاصك دير", en: "What to do" },
  f2: { ar: "خطوة واضحة: فين تخلّص ولا شنو تجاوب", en: "One clear next step: where to pay or how to reply" },
  f3T: { ar: "بالصوت", en: "Read aloud" },
  f3: { ar: "سمع الشرح بلا ما تحتاج تقرا", en: "Hear the explanation — no reading needed" },
  f4T: { ar: "صيفط للعائلة", en: "Send to family" },
  f4: { ar: "صيفط الشرح فواتساب باش يتأكدو معاك", en: "Share the explanation on WhatsApp to double-check" },
  f5T: { ar: "فكّرني", en: "Remind me" },
  f5: { ar: "تذكير فالكاليندري يومين قبل الأجل", en: "Calendar reminder 2 days before the deadline" },
  f6T: { ar: "رد البال من النصب", en: "Scam warnings" },
  f6: {
    ar: "إلا طلبو منك الكود ديال الكارط، رابط غريب ولا تحويل مستعجل، كنحذروك مباشرة.",
    en: "Asked for your card code, a strange link or an urgent transfer? We warn you right away.",
  },
  privacyTitle: { ar: "خصوصيتك قبل كلشي", en: "Your privacy first" },
  p1: { ar: "الصورة ما كتحفظش: كنقراوها ومن بعد كتمشي.", en: "Photos are never stored: read, then gone." },
  p2: { ar: "أرقام CIN، RIB والكارط كنخبيوهم", en: "ID, bank and card numbers are hidden" },
  p3: { ar: "كنصيفطو غير الشرح للعائلة، ماشي التصويرة.", en: "Only the explanation is shared with family, never the photo." },
  p4: {
    ar: "ما كنخترعو والو: إلا ما بانش شي حاجة كنقولوها ليك. وإلا كانت الورقة مهمة، تأكد ديما مع شي حد تيق فيه.",
    en: "Nothing is invented: if something isn't clear, we say so. For important papers, always check with someone you trust.",
  },
  ctaTitle: { ar: "عندك شي ورقة ما فهمتيهاش؟", en: "Got a paper you don't understand?" },
  ctaText: { ar: "جرب دابا، فابور.", en: "Try it now — it's free." },
  ctaBtn: { ar: "صوّر ورقة دابا", en: "Photograph a paper now" },
  footerAi: { ar: "الذكاء الاصطناعي يقدر يغلط: تأكد ديما من الورقة الأصلية.", en: "AI can make mistakes: always check the original paper." },

  // loading
  reading: { ar: "كنقرا الورقة…", en: "Reading your paper…" },
  stepSend: { ar: "كنصيفطو التصويرة", en: "Sending the photo" },
  stepRead: { ar: "كنقراو الورقة", en: "Reading the paper" },
  stepExplain: { ar: "كنوجدو الشرح بالدارجة", en: "Writing the explanation" },
  patience: { ar: "شوية صبر، قريب نساليو", en: "Almost there…" },

  // result
  riskLow: { ar: "عادي", en: "Normal" },
  riskMedium: { ar: "رد البال", en: "Careful" },
  riskHigh: { ar: "خطر", en: "Urgent" },
  scamTitle: { ar: "⚠️ رد البال! هادي فيها علامات ديال النصب", en: "⚠️ Careful! This shows signs of a scam" },
  before: { ar: "قبل", en: "Before" },
  whatToDo: { ar: "شنو خاصك دير", en: "What to do" },
  explanation: { ar: "الشرح بالدارجة", en: "Explanation" },
  listenAll: { ar: "سمع كلشي بالصوت", en: "Listen to everything" },
  retake: { ar: "صوّر ورقة أخرى", en: "Photograph another paper" },
  photoNote: { ar: "التصويرة ديالك ما تحفظاتش، غير كتبان هنا دابا.", en: "Your photo isn't saved — it's only shown here." },
  deadlinePassed: { ar: "الأجل فات", en: "Deadline passed" },
  deadlineToday: { ar: "اليوم هو آخر أجل", en: "Today is the deadline" },
  daysLeftFew: { ar: "بقاو غير {n} أيام", en: "Only {n} days left" },
  daysLeft: { ar: "بقاو {n} يوم", en: "{n} days left" },
  safety: { ar: "إلا كانت الورقة مهمة، تأكد مع شي حد تيق فيه.", en: "If this paper matters, check with someone you trust." },
  safetyUnsure: { ar: "ما متأكدينش مزيان من هاد القراية. ", en: "We're not fully sure about this reading. " },

  // feature buttons
  listen: { ar: "سمع الشرح", en: "Listen" },
  stop: { ar: "وقّف", en: "Stop" },
  loadingVoice: { ar: "كنوجد الصوت… (وقّف)", en: "Preparing the voice… (stop)" },
  voiceDown: { ar: "🔇 الصوت ما خدامش دابا، عاود من بعد شوية", en: "🔇 Voice unavailable right now, try again soon" },
  share: { ar: "صيفط لشي حد من العائلة", en: "Send to a family member" },
  remind: { ar: "فكّرني قبل الأجل", en: "Remind me before the deadline" },
  reminded: { ar: "✅ تزاد التذكير فالكاليندري ديالك", en: "✅ Reminder added to your calendar" },

  // errors
  errUnreadable: { ar: "الصورة ما واضحاش. عاود صوّر فضو مزيان وبلا ما تحرك التيليفون.", en: "The photo isn't clear. Take it again in good light, holding the phone still." },
  errNotDoc: { ar: "هادي ما باناتش ورقة. صوّر الورقة كاملة من الفوق.", en: "This doesn't look like a paper. Photograph the whole page from above." },
  errBadImage: { ar: "ما قدرناش نقراو هاد الصورة. جرب صورة أخرى.", en: "We couldn't use this image. Try another photo." },
  errRate: { ar: "بزاف ديال الطلبات. تسنى دقيقة وعاود.", en: "Too many requests. Wait a minute and try again." },
  errAi: { ar: "ما قدرناش نقراو هاد الورقة دابا. عاود بعد شوية.", en: "We couldn't read the paper right now. Please try again in a moment." },
  errNetwork: { ar: "كاين مشكل فالأنترنت. عاود من بعد شوية.", en: "Connection problem. Please try again in a moment." },
  errOther: { ar: "كاين مشكل. عاود من بعد شوية.", en: "Something went wrong. Please try again." },
  tip1: { ar: "💡 فضو مزيان، بلا ظل على الورقة", en: "💡 Good light, no shadow on the paper" },
  tip2: { ar: "💡 الورقة كاملة فالتصويرة، من الفوق", en: "💡 The whole page in the photo, from above" },
  tip3: { ar: "💡 ما تحركش التيليفون حتى تصوّر", en: "💡 Hold the phone still" },
  retry: { ar: "عاود صوّر", en: "Try again" },
} as const;

export type StringKey = keyof typeof STRINGS;

type Ctx = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
};

const LangContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "qra-lang";
const CHANGE_EVENT = "qra-lang-change";

// The chosen language lives in localStorage (remembered on the phone); the server always renders Darija.
function readLang(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "ar";
  } catch {
    return "ar"; // storage unavailable (private mode)
  }
}
function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
const serverLang = (): Lang => "ar";

export function LangProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(subscribe, readLang, serverLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage unavailable: the switch won't persist
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const t = useCallback(
    (key: StringKey, vars?: Record<string, string | number>) => {
      let s: string = STRINGS[key][lang];
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
      return s;
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): Ctx {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside <LangProvider>");
  return ctx;
}
