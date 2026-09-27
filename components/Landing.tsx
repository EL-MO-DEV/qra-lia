"use client";

import { useLang, type StringKey } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
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
    "باش تبدا، ورك على الزر الكبير الأخضر: صوّر الورقة.",
  en:
    "Welcome to Qra Lia. This app reads your paperwork and explains it to you simply. " +
    "Photograph any paper: an electricity or water bill, a bank letter, social security or a government letter. " +
    "We tell you what it is, who sent it, how much you have to pay and by when, and what to do next. " +
    "If it shows signs of a scam, like asking for your card code, we warn you. " +
    "You can listen to the explanation, send it to a family member, and add a reminder before the deadline. " +
    "Your photo is never stored. For important papers, always check with someone you trust. " +
    "To start, press the big green button: Take a photo.",
};

const STEPS: { icon: string; title: StringKey; text: StringKey; fr: string }[] = [
  { icon: "📸", title: "step1T", text: "step1", fr: "Photographiez le document" },
  { icon: "🤖", title: "step2T", text: "step2", fr: "L'IA le lit en quelques secondes" },
  { icon: "🔊", title: "step3T", text: "step3", fr: "Explication en darija, à l'écrit et à voix haute" },
];

const FEATURES: { icon: string; title: StringKey; text: StringKey }[] = [
  { icon: "💰", title: "f1T", text: "f1" },
  { icon: "✅", title: "f2T", text: "f2" },
  { icon: "🔊", title: "f3T", text: "f3" },
  { icon: "📤", title: "f4T", text: "f4" },
  { icon: "⏰", title: "f5T", text: "f5" },
];

/** Home screen: the camera button first (one tap to start), then what Qra Lia is and why to trust it. */
export default function Landing({ onFileChosen }: LandingProps) {
  const { lang, t } = useLang();

  return (
    <>
      <section className="hero" id="start">
        <div className="container hero-grid">
          <div className="reveal">
            <div style={{ marginBottom: 18 }}>
              <ListenButton text={PAGE_NARRATION[lang]} label={t("listenIntro")} sub="Écouter la présentation" prefetch={false} />
            </div>
            <span className="eyebrow">
              <span aria-hidden="true">✨</span> {t("eyebrow")}
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
            <div className="trust-row">
              <span className="trust-chip">{t("noSignup")}</span>
              <span className="trust-chip">{t("chipVoice")}</span>
              <span className="trust-chip">{t("chipFast")}</span>
              <span className="trust-chip">{t("chipScam")}</span>
            </div>
          </div>

          <div className="hero-card reveal">
            <UploadPanel onFileChosen={onFileChosen} />
          </div>
        </div>
      </section>

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
          <ol className="steps" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {STEPS.map((s, i) => (
              <li className="step" key={s.title}>
                <span className="step-num" aria-hidden="true">
                  {s.icon}
                </span>
                <div>
                  <h3>
                    {i + 1}. {t(s.title)}
                  </h3>
                  <p>{t(s.text)}</p>
                  <p className="fr" lang="fr">
                    {s.fr}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section" aria-labelledby="stat" style={{ paddingTop: 0 }}>
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

      <section className="section" aria-labelledby="what" style={{ paddingTop: 0 }}>
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
            {FEATURES.map((f) => (
              <div className="feature" key={f.title}>
                <span className="feature-icon" aria-hidden="true">
                  {f.icon}
                </span>
                <h3>{t(f.title)}</h3>
                <p>{t(f.text)}</p>
              </div>
            ))}
            <div className="feature feature-wide">
              <span className="feature-icon" aria-hidden="true">
                ⚠️
              </span>
              <h3>{t("f6T")}</h3>
              <p>{t("f6")}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="privacy" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="privacy">
            <h2 className="section-title" id="privacy" style={{ fontSize: 28 }}>
              {t("privacyTitle")}
              <span className="fr" lang="fr">
                Votre vie privée d&apos;abord
              </span>
            </h2>
            <ul className="privacy-list">
              <li>
                <span className="ico" aria-hidden="true">
                  🗑️
                </span>
                <span>{t("p1")}</span>
              </li>
              <li>
                <span className="ico" aria-hidden="true">
                  🙈
                </span>
                <span>
                  {t("p2")}
                  <span className="mask-demo">••••1234</span>
                </span>
              </li>
              <li>
                <span className="ico" aria-hidden="true">
                  📝
                </span>
                <span>{t("p3")}</span>
              </li>
              <li>
                <span className="ico" aria-hidden="true">
                  🤝
                </span>
                <span>{t("p4")}</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section cta-final" style={{ paddingTop: 0 }}>
        <div className="container">
          <h2 className="section-title">{t("ctaTitle")}</h2>
          <p>
            {t("ctaText")}
            <span className="fr" lang="fr">
              Essayez maintenant, c&apos;est gratuit.
            </span>
          </p>
          <a className="btn btn-primary" href="#start">
            <span aria-hidden="true">📸</span> {t("ctaBtn")}
          </a>
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
        </div>
      </footer>
    </>
  );
}
