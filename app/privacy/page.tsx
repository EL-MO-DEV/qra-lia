import type { Metadata } from "next";
import Link from "next/link";
import styles from "./privacy.module.css";

export const metadata: Metadata = {
  title: "الخصوصية والشروط — Qra Lia",
  description: "كيفاش Qra Lia كتعامل مع التصاور والمعلومات ديالك · Confidentialité et conditions d'utilisation",
};

// Plain-language privacy notice + terms. Draft for the test phase: to be reviewed by a lawyer before launch (law 09-08, CNDP).
const UPDATED = "2026-10-04";

export default function PrivacyPage() {
  return (
    <main className={`app-column ${styles.legal}`}>
      <p className={styles.back}>
        <Link href="/">← Qra Lia</Link>
      </p>

      <section lang="ar" dir="rtl">
        <h1 className="section-title">الخصوصية والشروط</h1>
        <p className={styles.note}>نسخة تجريبية · آخر تحديث {UPDATED}</p>

        <h2>شنو كنعملو بالتصويرة ديالك؟</h2>
        <ul>
          <li>كنصيفطو التصويرة للذكاء الاصطناعي (Google Gemini، ولا Groq إلا ما خدمش) باش يقراها ويشرحها. ما كنحفظوهاش عندنا.</li>
          <li>الڤوكال والأسئلة ديالك كيتصيفطو بنفس الطريقة باش نفهموهم ونجاوبوك، وما كيتحفظوش.</li>
          <li>فواتساب، التصويرة كتبقى غير فالذاكرة 30 دقيقة باش نقدرو نوريوك فين مكتوب المبلغ والأجل (كتب «وريني»)، ومن بعد كتمسح.</li>
          <li>أرقام البطاقة الوطنية، RIB والكارط كنخبيوهم فالجواب.</li>
          <li>فالتطبيق ما كاين لا حساب لا تسجيل. اللوغ ديالنا فيه غير معلومات تقنية (واش القراية نجحات)، ماشي الكلام اللي فالورقة.</li>
        </ul>

        <h2>التذكير فواتساب</h2>
        <ul>
          <li>إلا قبلتي التذكير، كنحفظو غير النمرة ديالك، التاريخ، وجملة قصيرة على الورقة، حتى نصيفطو التذكير، ومن بعد كيتمسحو.</li>
          <li>تذكيرات الدوا كتحفظ سمية الدوا، شحال، والوقت، حتى كيتصيفط التذكير، ومن بعد كيتمسحو. هادي معلومات صحية، دابا ما كنحفظو والو آخر.</li>
          <li>كتب «لغي» فواتساب باش تمسح التذكيرات ديالك فأي وقت.</li>
        </ul>

        <h2>رد البال</h2>
        <ul>
          <li>هادي نسخة تجريبية. خدمات الذكاء الاصطناعي المجانية يقدرو يستعملو المعلومات باش يحسنو الخدمة ديالهم، دابا ما تصيفطش أوراق حساسة بزاف.</li>
          <li>الذكاء الاصطناعي يقدر يغلط. Qra Lia ماشي محامي ولا بنكة: تأكد ديما من الورقة الأصلية، ومع الجهة اللي صيفطاتها ولا مع شي حد تيق فيه.</li>
          <li>Qra Lia عمرها ما غادي تطلب منك كود، كلمة سر ولا نمرة الكارط.</li>
        </ul>
      </section>

      <section lang="fr" dir="ltr" className={styles.other}>
        <h2>Confidentialité et conditions (français)</h2>
        <ul>
          <li>
            <strong>Photos, messages vocaux et questions</strong> sont transmis à des fournisseurs d&apos;IA (Google Gemini, Groq) uniquement
            pour lire le document, transcrire la voix et répondre. Qra Lia ne les conserve pas.
          </li>
          <li>
            Sur WhatsApp, la photo reste uniquement en mémoire pendant 30 minutes pour pouvoir montrer où sont écrits le montant et
            la date (« وريني »), puis elle est effacée.
          </li>
          <li>Les numéros de CIN, RIB/IBAN et de carte sont masqués dans les réponses.</li>
          <li>Aucun compte. Les journaux techniques ne contiennent ni le contenu des documents ni les questions.</li>
          <li>
            <strong>Rappels WhatsApp</strong> : seuls le numéro, la date et un court texte de rappel sont conservés jusqu&apos;à l&apos;envoi,
            puis supprimés. Écrivez « لغي » pour les supprimer à tout moment.
          </li>
          <li>
            <strong>Phase de test</strong> : lorsque des offres gratuites de fournisseurs d&apos;IA sont utilisées, leurs conditions peuvent
            permettre l&apos;utilisation des données pour améliorer leurs services. N&apos;envoyez pas de documents très sensibles.
          </li>
          <li>
            Qra Lia fournit une aide à la compréhension, pas un conseil juridique ou financier. L&apos;IA peut se tromper : vérifiez
            toujours le document original et auprès de l&apos;émetteur.
          </li>
          <li>
            <strong>Médicaments</strong> : Qra Lia recopie uniquement ce qui est écrit sur l&apos;ordonnance ou la boîte et ne donne aucun avis
            médical. Les rappels de prise conservent le nom du médicament, la dose et l&apos;heure jusqu&apos;à l&apos;envoi, puis sont supprimés
            (données de santé).
          </li>
          <li>Conformément à la loi 09-08, vous pouvez demander l&apos;accès ou la suppression de vos données (rappels) via WhatsApp.</li>
        </ul>
      </section>

      <section lang="en" dir="ltr" className={styles.other}>
        <h2>Privacy &amp; terms (English)</h2>
        <p>
          Photos, voice notes and questions go to AI providers (Google Gemini, Groq) only to read, transcribe and answer; Qra Lia does not
          keep them. ID/bank/card numbers are masked. No account. WhatsApp reminders keep only the number, the date and a short text until
          sent, then are deleted. This is a test version: free AI tiers may use data to improve their services, so avoid very sensitive
          papers. Qra Lia is not legal or financial advice; always check the original paper.
        </p>
      </section>
    </main>
  );
}
