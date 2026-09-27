import ListenButton from "./ListenButton";
import UploadPanel from "./UploadPanel";

// Spoken version of the whole home page, for people who can't read it.
const PAGE_NARRATION =
  "مرحبا بيك فاقرا ليا. هاد التطبيق كيقرا ليك الأوراق ديالك وكيشرحها ليك بالدارجة. " +
  "صوّر أي ورقة: فاتورة ديال الضو والما، رسالة ديال البنكة، الضمان الاجتماعي ولا الإدارة. " +
  "غادي نقولو ليك شنو هي هاد الورقة، شكون صيفطها، شحال خاصك تخلّص وفوقاش، وشنو خاصك دير. " +
  "وإلا كانت فيها علامات ديال النصب، بحال إلا طلبو منك الكود ديال الكارط، غادي نحذروك. " +
  "تقدر تسمع الشرح بالصوت، وتصيفطو لشي حد من العائلة، وتزيد تذكير قبل الأجل. " +
  "التصويرة ما كتحفظش عندنا. وإلا كانت الورقة مهمة، تأكد ديما مع شي حد تيق فيه. " +
  "باش تبدا، ورك على الزر الكبير الأخضر: صوّر الورقة.";

type LandingProps = {
  onFileChosen: (file: File) => void;
};

const STEPS = [
  { icon: "📸", title: "صوّر الورقة", text: "فاتورة، رسالة ديال البنكة، CNSS، الإدارة…", fr: "Photographiez le document" },
  { icon: "🤖", title: "كنقراوها ليك", text: "الذكاء الاصطناعي كيفهم الفرنسية والعربية فثواني", fr: "L'IA le lit en quelques secondes" },
  { icon: "🔊", title: "سمع وفهم بالدارجة", text: "شنو هي، شحال، فوقاش، وشنو خاصك دير", fr: "Explication en darija, à l'écrit et à voix haute" },
];

const FEATURES = [
  { icon: "💰", title: "شحال وفوقاش", text: "المبلغ والأجل بخط كبير، وشحال بقا ليك من يوم" },
  { icon: "✅", title: "شنو خاصك دير", text: "خطوة واضحة: فين تخلّص ولا شنو تجاوب" },
  { icon: "🔊", title: "بالصوت", text: "سمع الشرح بلا ما تحتاج تقرا" },
  { icon: "📤", title: "صيفط للعائلة", text: "صيفط الشرح فواتساب باش يتأكدو معاك" },
  { icon: "⏰", title: "فكّرني", text: "تذكير فالكاليندري يومين قبل الأجل" },
];

/** Home screen: the camera button first (one tap to start), then what Qra Lia is and why to trust it. */
export default function Landing({ onFileChosen }: LandingProps) {
  return (
    <>
      <section className="hero" id="start">
        <div className="container hero-grid">
          <div className="reveal">
            <div style={{ marginBottom: 18 }}>
              <ListenButton
                text={PAGE_NARRATION}
                label="سمع شنو هو هاد التطبيق"
                sub="Écouter la présentation"
                prefetch={false}
              />
            </div>
            <span className="eyebrow">
              <span aria-hidden="true">✨</span> مساعد ذكي للأوراق ديالك
            </span>
            <h1 className="hero-title">
              صوّر أي ورقة، <span className="hl">نشرحوها ليك</span> بالدارجة
            </h1>
            <p className="hero-sub">فاتورة، رسالة ديال البنكة ولا الإدارة: نقولو ليك شنو فيها، شحال خاصك تخلّص، وفوقاش.</p>
            <p className="hero-sub-fr" lang="fr">
              Photographiez n&apos;importe quel document : on vous l&apos;explique en darija, à l&apos;écrit et à voix haute.
            </p>
            <div className="trust-row">
              <span className="trust-chip">🔒 بلا تسجيل</span>
              <span className="trust-chip">🔊 بالصوت</span>
              <span className="trust-chip">⚡ فثواني</span>
              <span className="trust-chip">🛡️ كنكشفو النصب</span>
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
            <p className="section-kicker">كيفاش كتخدم</p>
            <h2 className="section-title" id="how">
              3 خطوات وصافي
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
                    {i + 1}. {s.title}
                  </h3>
                  <p>{s.text}</p>
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
              واحد من كل 4 ديال المغاربة ما كيعرفش يقرا، والأوراق الرسمية كتجي بالفرنسية ولا بالعربية الفصحى.
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
            <p className="section-kicker">شنو كتاخد</p>
            <h2 className="section-title" id="what">
              كلشي واضح، بخط كبير
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
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
            <div className="feature feature-wide">
              <span className="feature-icon" aria-hidden="true">
                ⚠️
              </span>
              <h3>رد البال من النصب</h3>
              <p>إلا طلبو منك الكود ديال الكارط، رابط غريب ولا تحويل مستعجل، كنحذروك مباشرة.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="privacy" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="privacy">
            <h2 className="section-title" id="privacy" style={{ fontSize: 28 }}>
              خصوصيتك قبل كلشي
              <span className="fr" lang="fr">
                Votre vie privée d&apos;abord
              </span>
            </h2>
            <ul className="privacy-list">
              <li>
                <span className="ico" aria-hidden="true">
                  🗑️
                </span>
                <span>الصورة ما كتحفظش: كنقراوها ومن بعد كتمشي.</span>
              </li>
              <li>
                <span className="ico" aria-hidden="true">
                  🙈
                </span>
                <span>
                  أرقام CIN، RIB والكارط كنخبيوهم
                  <span className="mask-demo">••••1234</span>
                </span>
              </li>
              <li>
                <span className="ico" aria-hidden="true">
                  📝
                </span>
                <span>كنصيفطو غير الشرح للعائلة، ماشي التصويرة.</span>
              </li>
              <li>
                <span className="ico" aria-hidden="true">
                  🤝
                </span>
                <span>ما كنخترعو والو: إلا ما بانش شي حاجة كنقولوها ليك. وإلا كانت الورقة مهمة، تأكد ديما مع شي حد تيق فيه.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section cta-final" style={{ paddingTop: 0 }}>
        <div className="container">
          <h2 className="section-title">عندك شي ورقة ما فهمتيهاش؟</h2>
          <p>
            جرب دابا، فابور.
            <span className="fr" lang="fr">
              Essayez maintenant, c&apos;est gratuit.
            </span>
          </p>
          <a className="btn btn-primary" href="#start">
            <span aria-hidden="true">📸</span> صوّر ورقة دابا
          </a>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <p>
            <strong>Qra Lia · اقرا ليا</strong> — GOMYCODE × NVIDIA « Come Build with AI » 2026
          </p>
          <p>الذكاء الاصطناعي يقدر يغلط: تأكد ديما من الورقة الأصلية.</p>
          <p lang="fr" dir="ltr">
            L&apos;IA peut se tromper : vérifiez toujours le document original.
          </p>
        </div>
      </footer>
    </>
  );
}
