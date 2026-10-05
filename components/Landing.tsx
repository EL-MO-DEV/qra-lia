"use client";

import {
  ArrowLeft,
  BellRing,
  Banknote,
  CalendarDays,
  Camera,
  CircleCheck,
  EyeOff,
  HeartHandshake,
  ListChecks,
  LockKeyhole,
  MessageSquareText,
  Pill,
  ScanSearch,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
  TriangleAlert,
  Volume2,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useLang, type StringKey } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
import InstallPrompt from "./InstallPrompt";
import ListenButton from "./ListenButton";
import UploadPanel from "./UploadPanel";

type LandingProps = {
  onFileChosen: (file: File) => void;
};

// Spoken version of the whole home page, for people who can't read it.
const PAGE_NARRATION: Record<Lang, string> = {
  ar:
    "مرحبا بيك فاقرا ليا. هاد التطبيق كيقرا ليك الأوراق ديالك وكيشرحها ليك بالدارجة. " +
    "صوّر أي ورقة: فاتورة ديال الضو والما، رسالة ديال البنكة، الضمان الاجتماعي ولا الإدارة. " +
    "غادي نقولو ليك شنو هي هاد الورقة، شكون صيفطها، شحال خاصك تخلّص وفوقاش، وشنو خاصك دير. " +
    "وإلا كانت فيها علامات ديال النصب، بحال إلا طلبو منك الكود ديال الكارط، غادي نحذروك. " +
    "تقدر تسمع الشرح بالصوت، وتصيفطو لشي حد من العائلة، وتزيد تذكير قبل الأجل. " +
    "التصويرة ما كتحفظش عندنا. وإلا كانت الورقة مهمة، تأكد ديما مع شي حد تيق فيه. " +
    "باش تبدا، ورك على الزر الكبير الزرق: صوّر الورقة.",
  en:
    "Welcome to Qra Lia. This app reads your paperwork and explains it to you simply. " +
    "Photograph any paper: an electricity or water bill, a bank letter, social security or a government letter. " +
    "We tell you what it is, who sent it, how much you have to pay and by when, and what to do next. " +
    "If it shows signs of a scam, like asking for your card code, we warn you. " +
    "You can listen to the explanation, send it to a family member, and add a reminder before the deadline. " +
    "Your photo is never stored. For important papers, always check with someone you trust. " +
    "To start, press the big blue button: Take a photo.",
};

// What the sample result in the phone mock-up shows (same data as the demo result).
const SAMPLE: Record<Lang, { doc: string; sender: string; amount: string; deadline: string; left: string; action: string; risk: string }> = {
  ar: {
    doc: "فاتورة الضو والما",
    sender: "ONEE",
    amount: "340 درهم",
    deadline: "قبل 15 أكتوبر",
    left: "بقاو 18 يوم",
    action: "خلّص فالوكالة ولا فالتطبيق",
    risk: "رد البال",
  },
  en: {
    doc: "Electricity & water bill",
    sender: "ONEE",
    amount: "340 MAD",
    deadline: "Before 15 October",
    left: "18 days left",
    action: "Pay at the agency or in the app",
    risk: "Careful",
  },
};

const STEPS: { Icon: LucideIcon; title: StringKey; text: StringKey; fr: string }[] = [
  { Icon: Camera, title: "step1T", text: "step1", fr: "Photographiez le document" },
  { Icon: ScanSearch, title: "step2T", text: "step2", fr: "L'IA le lit en quelques secondes" },
  { Icon: Volume2, title: "step3T", text: "step3", fr: "Explication en darija, à l'écrit et à voix haute" },
];

const FEATURES: { Icon: LucideIcon; tone: string; title: StringKey; text: StringKey }[] = [
  { Icon: Banknote, tone: "tone-blue", title: "f1T", text: "f1" },
  { Icon: ListChecks, tone: "tone-green", title: "f2T", text: "f2" },
  { Icon: Volume2, tone: "tone-blue", title: "f3T", text: "f3" },
  { Icon: Send, tone: "tone-green", title: "f4T", text: "f4" },
  { Icon: BellRing, tone: "tone-gold", title: "f5T", text: "f5" },
];

const PRIVACY: { Icon: LucideIcon; text: StringKey; mask?: boolean }[] = [
  { Icon: Trash2, text: "p1" },
  { Icon: EyeOff, text: "p2", mask: true },
  { Icon: MessageSquareText, text: "p3" },
  { Icon: HeartHandshake, text: "p4" },
];

/** A phone showing a sample result: people see what they get before trying. */
function PhonePreview() {
  const { lang, t } = useLang();
  const s = SAMPLE[lang];
  return (
    <div className="phone-stage" aria-hidden="true">
      <div className="phone">
        <div className="phone-notch" />
        <div className="phone-screen">
          <div className="pv-listen">
            <Volume2 size={20} strokeWidth={2.4} />
            <span>{t("listenAll")}</span>
            <span className="pv-eq">
              <i />
              <i />
              <i />
            </span>
          </div>
          <div className="pv-risk">
            <span className="pv-risk-icon">
              <TriangleAlert size={18} strokeWidth={2.5} />
            </span>
            <div>
              <span className="pv-risk-level">{s.risk}</span>
              <p className="pv-doc">{s.doc}</p>
              <p className="pv-sender">{s.sender}</p>
            </div>
          </div>
          <div className="pv-ticket">
            <p className="pv-amount">{s.amount}</p>
            <div className="pv-cut" />
            <p className="pv-deadline">
              <CalendarDays size={16} strokeWidth={2.4} /> {s.deadline}
            </p>
            <span className="pv-pill">
              <CircleCheck size={14} strokeWidth={2.6} /> {s.left}
            </span>
          </div>
          <div className="pv-todo">
            <ListChecks size={18} strokeWidth={2.4} />
            <span>{s.action}</span>
          </div>
          <div className="pv-share">
            <Send size={16} strokeWidth={2.4} className="flip-rtl" />
            <span>{t("share")}</span>
          </div>
        </div>
      </div>
      <span className="float-chip float-a">
        <Volume2 size={18} strokeWidth={2.5} /> {t("floatVoice")}
      </span>
      <span className="float-chip float-b">
        <ShieldAlert size={18} strokeWidth={2.5} /> {t("floatScam")}
      </span>
      <span className="float-chip float-c">
        <BellRing size={18} strokeWidth={2.5} /> {t("floatDeadline")}
      </span>
    </div>
  );
}

/** Home screen: the camera button first (one tap to start), then what Qra Lia is and why to trust it. */
export default function Landing({ onFileChosen }: LandingProps) {
  const { lang, t } = useLang();

  return (
    <>
      <section className="hero" id="start">
        <div className="hero-backdrop" aria-hidden="true" />
        <div className="container hero-grid">
          <div className="hero-copy reveal">
            <span className="eyebrow">
              <Sparkles size={16} strokeWidth={2.5} aria-hidden="true" /> {t("eyebrow")}
            </span>
            <h1 className="hero-title">
              {t("heroA")}
              <span className="hl">{t("heroHl")}</span>
              {t("heroB")}
            </h1>
            <p className="hero-sub">{t("heroSub")}</p>
            <p className="hero-sub-fr fr" lang="fr">
              Photographiez n&apos;importe quel document : on vous l&apos;explique en darija, à l&apos;écrit et à voix haute.
            </p>

            <div className="hero-card">
              <UploadPanel onFileChosen={onFileChosen} />
            </div>

            {/* 💊 Second entry: medicines and prescriptions */}
            <Link href="/dwa" className="feature-btn" style={{ marginTop: 14, textDecoration: "none" }}>
              <span className="feature-btn-icon" aria-hidden="true">
                <Pill size={24} strokeWidth={2.3} />
              </span>
              <span className="feature-btn-text">
                <span className="feature-btn-label">{t("medsEntry")}</span>
                <span className="feature-btn-sub" style={{ direction: "inherit" }}>
                  {t("medsEntrySub")}
                </span>
              </span>
              <ArrowLeft size={22} strokeWidth={2.6} aria-hidden="true" className="flip-ltr" style={{ marginInlineStart: "auto", color: "var(--primary-text)" }} />
            </Link>

            <div className="hero-listen">
              <ListenButton text={PAGE_NARRATION[lang]} label={t("listenIntro")} sub="Écouter la présentation" />
            </div>

            <ul className="trust-row">
              <li className="trust-chip">
                <LockKeyhole size={16} strokeWidth={2.5} aria-hidden="true" /> {t("noSignup")}
              </li>
              <li className="trust-chip">
                <Volume2 size={16} strokeWidth={2.5} aria-hidden="true" /> {t("chipVoice")}
              </li>
              <li className="trust-chip">
                <Zap size={16} strokeWidth={2.5} aria-hidden="true" /> {t("chipFast")}
              </li>
              <li className="trust-chip">
                <ShieldAlert size={16} strokeWidth={2.5} aria-hidden="true" /> {t("chipScam")}
              </li>
            </ul>
          </div>

          <div className="hero-preview reveal">
            <PhonePreview />
          </div>
        </div>
      </section>

      <div className="container">
        <InstallPrompt />
      </div>

      <section className="section" aria-labelledby="how">
        <div className="container">
          <div className="section-head">
            <p className="section-kicker">{t("howKicker")}</p>
            <h2 className="section-title" id="how">
              {t("howTitle")}
              <span className="fr" lang="fr">
                Comment ça marche
              </span>
            </h2>
          </div>
          <ol className="steps">
            {STEPS.map(({ Icon, title, text, fr }, i) => (
              <li className="step" key={title}>
                <span className="step-icon" aria-hidden="true">
                  <Icon size={28} strokeWidth={2.2} />
                  <span className="step-num">{i + 1}</span>
                </span>
                <div>
                  <h3>{t(title)}</h3>
                  <p>{t(text)}</p>
                  <p className="fr" lang="fr">
                    {fr}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section sample-section" aria-labelledby="sample">
        <div className="container">
          <div className="section-head">
            <p className="section-kicker">{t("sampleKicker")}</p>
            <h2 className="section-title" id="sample">
              {t("sampleTitle")}
              <span className="fr" lang="fr">
                Voici ce que vous obtenez
              </span>
            </h2>
            <p className="section-sub">{t("sampleNote")}</p>
          </div>
          <PhonePreview />
        </div>
      </section>

      <section className="section" aria-labelledby="stat">
        <div className="container">
          <div className="stat-band">
            <p className="stat-number" id="stat">
              1 / 4
            </p>
            <p className="stat-text">
              {t("statText")}
              <span className="fr" lang="fr">
                1 Marocain sur 4 ne sait pas lire — les papiers officiels arrivent en français ou en arabe classique.
              </span>
            </p>
            <p className="stat-source">Source: HCP, RGPH 2024 (24.8%)</p>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="what">
        <div className="container">
          <div className="section-head">
            <p className="section-kicker">{t("whatKicker")}</p>
            <h2 className="section-title" id="what">
              {t("whatTitle")}
              <span className="fr" lang="fr">
                Tout ce qu&apos;il faut savoir, en grand
              </span>
            </h2>
          </div>
          <div className="features">
            {FEATURES.map(({ Icon, tone, title, text }) => (
              <div className="feature" key={title}>
                <span className={`feature-icon ${tone}`} aria-hidden="true">
                  <Icon size={26} strokeWidth={2.2} />
                </span>
                <h3>{t(title)}</h3>
                <p>{t(text)}</p>
              </div>
            ))}
            <div className="feature feature-wide">
              <span className="feature-icon tone-red" aria-hidden="true">
                <ShieldAlert size={28} strokeWidth={2.2} />
              </span>
              <div>
                <h3>{t("f6T")}</h3>
                <p>{t("f6")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="privacy">
        <div className="container">
          <div className="privacy">
            <h2 className="section-title privacy-title" id="privacy">
              {t("privacyTitle")}
              <span className="fr" lang="fr">
                Votre vie privée d&apos;abord
              </span>
            </h2>
            <ul className="privacy-list">
              {PRIVACY.map(({ Icon, text, mask }) => (
                <li key={text}>
                  <span className="ico" aria-hidden="true">
                    <Icon size={22} strokeWidth={2.3} />
                  </span>
                  <span>
                    {t(text)}
                    {mask && <span className="mask-demo">••••1234</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="cta">
        <div className="container">
          <div className="cta-final">
            <h2 className="section-title" id="cta">
              {t("ctaTitle")}
            </h2>
            <p>
              {t("ctaText")}
              <span className="fr" lang="fr">
                Essayez maintenant, c&apos;est gratuit.
              </span>
            </p>
            <a className="btn btn-accent btn-lg" href="#start">
              <Camera size={24} strokeWidth={2.3} aria-hidden="true" /> {t("ctaBtn")}
              <ArrowLeft size={22} strokeWidth={2.6} aria-hidden="true" className="flip-ltr" />
            </a>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <p>
            <strong>Qra Lia · اقرا ليا</strong> — GOMYCODE × NVIDIA « Come Build with AI » 2026
          </p>
          <p>{t("footerAi")}</p>
          <p lang="fr" dir="ltr" className="fr">
            L&apos;IA peut se tromper : vérifiez toujours le document original.
          </p>
          <p>
            <Link href="/privacy" style={{ color: "var(--primary-text)", fontWeight: 600 }}>
              الخصوصية والشروط · Confidentialité
            </Link>
          </p>
        </div>
      </footer>
    </>
  );
}
