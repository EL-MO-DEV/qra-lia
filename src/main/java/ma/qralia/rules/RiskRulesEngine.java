package ma.qralia.rules;

import ma.qralia.domain.ReadResult;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Deterministic overlay on the model's risk. Final risk = the higher of model vs rules.
 */
@Component
public class RiskRulesEngine {

    public static final String REASON_DEADLINE_PASSED = "الأجل فات";
    public static final String REASON_FEW_DAYS = "بقاو غير أيام قلال";
    public static final String REASON_VERIFY = "تأكد مع شي حد";
    public static final String REASON_LEGAL = "إشارات قانونية خطيرة (محكمة / استخلاص / قطع)";
    public static final String REASON_SCAM = "علامات ديال النصب";
    public static final String REASON_SOON = "الأجل قريب (أقل من 7 أيام)";

    static final String[] LEGAL_KEYWORDS = {
            "tribunal", "huissier", "recouvrement", "coupure", "mise en demeure",
            "assignation", "saisie", "contentieux", "coupure d'eau", "coupure d'électricité",
            "محكمة", "محكمه", "تبليغ قضائي", "إنذار قانوني", "انذار قانوني",
            "استخلاص", "تحصيل الديون", "قطع الكهرباء", "قطع الضوء", "قطع الماء",
            "قطيعة", "mise en demeure", "huissier de justice"
    };

    static final String[] SCAM_KEYWORDS = {
            "cvv", "cvc", "code otp", "otp", "mot de passe", "password", "code carte",
            "numéro de carte", "numero de carte", "code secret",
            "bit.ly", "tinyurl", "t.ly", "rb7ti", "ربحت", "جائزة", "félicitations tu as",
            "compte personnel", "حساب شخصي", "حساب بنكي شخصي",
            "كود ديال الكرط", "كود البطاقة", "موت دو باس", "رقم البطاقة"
    };

    public Ruled apply(ReadResult extraction, ZoneId zone) {
        Integer daysLeft = daysLeft(extraction.deadline(), zone);
        String modelLevel = normalizeLevel(extraction.riskLevel());
        int score = rank(modelLevel);

        Set<String> reasons = new LinkedHashSet<>();
        if (extraction.riskReasons() != null) {
            reasons.addAll(extraction.riskReasons());
        }

        boolean scam = extraction.scamSuspected();
        String haystack = haystack(extraction);

        if (daysLeft != null && daysLeft < 0) {
            score = Math.max(score, rank("high"));
            reasons.add(REASON_DEADLINE_PASSED);
        } else if (daysLeft != null && daysLeft <= 3) {
            score = Math.max(score, rank("high"));
            reasons.add(REASON_FEW_DAYS);
        } else if (daysLeft != null && daysLeft <= 7) {
            score = Math.max(score, rank("medium"));
            reasons.add(REASON_SOON);
        }

        if (containsAny(haystack, LEGAL_KEYWORDS)) {
            score = Math.max(score, rank("high"));
            reasons.add(REASON_LEGAL);
        }

        if (containsAny(haystack, SCAM_KEYWORDS) || scam) {
            scam = true;
            score = Math.max(score, rank("high"));
            reasons.add(REASON_SCAM);
        }

        if (extraction.confidence() < 0.6) {
            reasons.add(REASON_VERIFY);
        }

        return new Ruled(daysLeft, fromRank(score), new ArrayList<>(reasons), scam);
    }

    public Integer daysLeft(String deadline, ZoneId zone) {
        if (deadline == null || deadline.isBlank()) {
            return null;
        }
        try {
            LocalDate date = LocalDate.parse(deadline.trim().substring(0, Math.min(10, deadline.trim().length())));
            LocalDate today = LocalDate.now(zone);
            return (int) java.time.temporal.ChronoUnit.DAYS.between(today, date);
        } catch (DateTimeParseException | StringIndexOutOfBoundsException e) {
            return null;
        }
    }

    static int rank(String level) {
        return switch (level) {
            case "high" -> 3;
            case "medium" -> 2;
            default -> 1;
        };
    }

    static String fromRank(int rank) {
        if (rank >= 3) {
            return "high";
        }
        if (rank == 2) {
            return "medium";
        }
        return "low";
    }

    static String normalizeLevel(String level) {
        if (level == null) {
            return "low";
        }
        String v = level.toLowerCase(Locale.ROOT);
        if (v.equals("high") || v.equals("medium") || v.equals("low")) {
            return v;
        }
        return "low";
    }

    static String haystack(ReadResult r) {
        List<String> parts = new ArrayList<>();
        parts.add(r.docType());
        parts.add(r.sender());
        parts.add(r.action());
        parts.add(r.darijaSummary());
        if (r.riskReasons() != null) {
            parts.addAll(r.riskReasons());
        }
        StringBuilder sb = new StringBuilder();
        for (String p : parts) {
            if (p != null) {
                sb.append(' ').append(p.toLowerCase(Locale.ROOT));
            }
        }
        return sb.toString();
    }

    static boolean containsAny(String haystack, String[] keywords) {
        String h = haystack.toLowerCase(Locale.ROOT);
        for (String k : keywords) {
            if (h.contains(k.toLowerCase(Locale.ROOT))) {
                return true;
            }
        }
        return false;
    }

    public record Ruled(Integer daysLeft, String riskLevel, List<String> riskReasons, boolean scamSuspected) {}
}
