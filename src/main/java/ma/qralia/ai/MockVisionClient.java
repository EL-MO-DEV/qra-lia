package ma.qralia.ai;

import ma.qralia.domain.Amount;
import ma.qralia.domain.ModelExtraction;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Component
public class MockVisionClient implements AiVisionClient {

    @Override
    public String id() {
        return "gemini";
    }

    @Override
    public boolean enabled() {
        return true;
    }

    @Override
    public ModelExtraction extract(byte[] imageBytes, String mimeType, boolean retryForValidJson) {
        return scenario("low");
    }

    public ModelExtraction scenario(String name) {
        return switch (name == null ? "low" : name) {
            case "unreadable" -> new ModelExtraction(
                    "unreadable",
                    null, null, null, null, null,
                    "low",
                    List.of(),
                    false,
                    0.2,
                    "الصورة ما واضحاش. عاود صوّر فضو مزيان."
            );
            case "not_a_document" -> new ModelExtraction(
                    "not_a_document",
                    null, null, null, null, null,
                    "low",
                    List.of(),
                    false,
                    0.15,
                    "هادشي ما باينش ورقة رسمية. صوّر الوثيقة كاملة من الفوق."
            );
            case "scam" -> new ModelExtraction(
                    "ok",
                    "رسالة مشبوهة",
                    "خدمة الجوائز",
                    new Amount(1.0, "MAD"),
                    LocalDate.now(ZoneId.of("Africa/Casablanca")).plusDays(1).toString(),
                    "متصيفط حتى كود وما تدخلش للرابط",
                    "high",
                    List.of("طلب كود البطاقة", "رابط غريب", "ربحت جائزة"),
                    true,
                    0.55,
                    "هاد الرسالة كتقول ربحتي فلوس وكتطلب كود البطاقة ورابط غريب. هادشي علامات ديال النصب. متصيفط والو وتأكد مع شي حد تعولو عليه."
            );
            case "high" -> new ModelExtraction(
                    "ok",
                    "mise en demeure",
                    "Cabinet d'huissier",
                    new Amount(4200.0, "MAD"),
                    LocalDate.now(ZoneId.of("Africa/Casablanca")).plusDays(2).toString(),
                    "تكلم مع شي حد تعولو عليه قبل ما توقع",
                    "high",
                    List.of("ذكر المحكمة", "استخلاص الديون"),
                    false,
                    0.72,
                    "هاد الورقة خطيرة: مكتوب فيها المحكمة واستخلاص الديون. المبلغ تقريبا 4200 درهم والأجل قريب. ما تعتمدش غير على التطبيق، سول محامي ولا شي حد من العائلة."
            );
            case "medium" -> new ModelExtraction(
                    "ok",
                    "facture eau",
                    "Lydec",
                    new Amount(312.5, "MAD"),
                    LocalDate.now(ZoneId.of("Africa/Casablanca")).plusDays(5).toString(),
                    "خلّص الفاتورة قبل الأجل باش ما تزادش الغرامة",
                    "medium",
                    List.of("الأجل قريب", "ذكر الغرامة"),
                    false,
                    0.8,
                    "هاد فاتورة الماء من ليديك. خاصك تخلّص تقريبا 312 درهم قبل خمسة أيام. إلا ما خلّصتيش كيقولو غادي تزاد غرامة. التطبيق ما كيأكدش باللي كلشي سليم، غير كيقرى اللي باين."
            );
            default -> new ModelExtraction(
                    "ok",
                    "facture électricité",
                    "ONEE",
                    new Amount(247.8, "MAD"),
                    LocalDate.now(ZoneId.of("Africa/Casablanca")).plusDays(18).toString(),
                    "خلّص الفاتورة قبل تاريخ الأجل",
                    "low",
                    List.of("فاتورة عادية", "الأجل باقي بعيد"),
                    false,
                    0.86,
                    "هاد فاتورة الضوء من ONEE. المبلغ تقريبا 248 درهم. باقي الوقت باش تخلّص. التطبيق ما كيقولش هادي 100 فالمية سليمة، غير كيشرح اللي قرا ف الورقة."
            );
        };
    }
}
