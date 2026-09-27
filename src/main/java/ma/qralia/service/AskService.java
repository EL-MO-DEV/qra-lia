package ma.qralia.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import ma.qralia.ai.SystemPrompt;
import ma.qralia.config.AppProperties;
import ma.qralia.domain.AskResponse;
import ma.qralia.domain.ReadResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
public class AskService {

    private static final Logger log = LoggerFactory.getLogger(AskService.class);

    private final AppProperties properties;
    private final ObjectMapper mapper;

    public AskService(AppProperties properties, ObjectMapper mapper) {
        this.properties = properties;
        this.mapper = mapper;
    }

    public AskResponse ask(ReadResult result, String question) {
        if (question == null || question.isBlank() || result == null) {
            return new AskResponse("السؤال ما واضحش. عاود كتبّو بصيغة بسيطة.", false, "none");
        }
        if (properties.gemini().enabled()) {
            try {
                return askGemini(result, question);
            } catch (Exception e) {
                log.warn("ask_gemini_failed type={}", e.getClass().getSimpleName());
            }
        }
        return heuristic(result, question);
    }

    private AskResponse askGemini(ReadResult result, String question) throws Exception {
        String json = mapper.writeValueAsString(result);
        try (var client = com.google.genai.Client.builder().apiKey(properties.gemini().apiKey()).build()) {
            var response = client.models.generateContent(
                    properties.gemini().model(),
                    SystemPrompt.ASK + "\nDocument JSON:\n" + json + "\nQuestion:\n" + question,
                    null
            );
            String text = response.text();
            boolean based = !looksUnknown(text);
            return new AskResponse(text, based, "gemini");
        }
    }

    private AskResponse heuristic(ReadResult result, String question) {
        String q = question.toLowerCase(Locale.ROOT);
        if (contains(q, "montant", "ch7al", "شحال", "فلوس", "amount", "combien")) {
            if (result.amount() != null && result.amount().value() != null) {
                return new AskResponse(
                        "المبلغ اللي بان ف الورقة هو " + result.amount().value() + " " + nullTo(result.amount().currency(), "MAD") + ".",
                        true,
                        "rules"
                );
            }
        }
        if (contains(q, "deadline", "date", "وقت", "أجل", "نهار", "quand")) {
            if (result.deadline() != null) {
                return new AskResponse("تاريخ الأجل اللي بان هو " + result.deadline() + ".", true, "rules");
            }
        }
        if (contains(q, "scam", "arnaque", "نصب", "آمن", "safe")) {
            if (result.scamSuspected()) {
                return new AskResponse("كاينين علامات ديال النصب. متصيفط حتى معلومات سرية، وسول شي حد تعولو عليه.", true, "rules");
            }
            return new AskResponse(
                    "التطبيق عمرّو ما كيقول هادي 100 فالمية سليمة. المستوى " + result.riskLevel() + ". الإنسان هو اللي كيقرر.",
                    true,
                    "rules"
            );
        }
        if (result.darijaSummary() != null) {
            return new AskResponse(
                    "من اللي بان ف الاستخراج: " + result.darijaSummary() + " إلا ما لقيتيش الجواب هنا، راه ما كاينش ف الورقة اللي قرينا.",
                    true,
                    "rules"
            );
        }
        return new AskResponse("هاد الجواب ما كاينش ف الوثيقة اللي قرينا.", false, "rules");
    }

    private static boolean looksUnknown(String text) {
        if (text == null) {
            return true;
        }
        String t = text.toLowerCase(Locale.ROOT);
        return t.contains("ما كاينش") || t.contains("not in") || t.contains("ما ذكر");
    }

    private static boolean contains(String q, String... keys) {
        for (String k : keys) {
            if (q.contains(k.toLowerCase(Locale.ROOT))) {
                return true;
            }
        }
        return false;
    }

    private static String nullTo(String v, String d) {
        return v == null ? d : v;
    }
}
