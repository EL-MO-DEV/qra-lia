package ma.qralia.mask;

import ma.qralia.domain.Amount;
import ma.qralia.domain.ReadResult;
import ma.qralia.domain.RecommendedAction;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Defense in depth: mask CIN / RIB / IBAN / card numbers in every string field.
 * Keep only the last 4 characters: ••••1234. Contract / client numbers are left as-is.
 */
@Component
public class SensitiveDataMasker {

    private static final Pattern IBAN = Pattern.compile("(?i)(?<!\\w)MA(?:[ \\-]?\\d){26}(?!\\d)");
    private static final Pattern RIB = Pattern.compile("(?<!\\d)(?:\\d[ \\-]?){23}\\d(?!\\d)");
    private static final Pattern CARD = Pattern.compile("(?<!\\d)(?:\\d[ \\-]?){12,18}\\d(?!\\d)");
    private static final Pattern CIN = Pattern.compile("(?i)(?<![A-Z0-9])[A-Z]{1,2}\\d{5,6}(?![A-Z0-9])");

    public ReadResult mask(ReadResult in) {
        if (in == null) {
            return null;
        }
        Amount amount = in.amount();
        Amount maskedAmount = amount == null
                ? null
                : new Amount(amount.value(), maskText(amount.currency()));
        List<String> reasons = in.riskReasons() == null ? List.of() : in.riskReasons().stream().map(this::maskText).toList();
        List<RecommendedAction> actions = in.recommendedActions() == null
                ? List.of()
                : in.recommendedActions().stream()
                .map(a -> new RecommendedAction(a.code(), maskText(a.labelDarija()), maskText(a.detail())))
                .toList();
        return new ReadResult(
                maskText(in.status()),
                maskText(in.docType()),
                maskText(in.sender()),
                maskedAmount,
                maskText(in.deadline()),
                in.daysLeft(),
                maskText(in.action()),
                maskText(in.riskLevel()),
                reasons,
                in.scamSuspected(),
                in.confidence(),
                maskText(in.darijaSummary()),
                in.provider(),
                in.latencyMs(),
                actions
        );
    }

    public String maskText(String input) {
        if (input == null || input.isEmpty()) {
            return input;
        }
        String out = replaceAll(IBAN, input);
        out = replaceAll(RIB, out);
        out = replaceAll(CARD, out);
        out = replaceAll(CIN, out);
        return out;
    }

    private static String replaceAll(Pattern pattern, String input) {
        Matcher matcher = pattern.matcher(input);
        StringBuilder sb = new StringBuilder();
        while (matcher.find()) {
            matcher.appendReplacement(sb, Matcher.quoteReplacement(maskKeepLast4(matcher.group())));
        }
        matcher.appendTail(sb);
        return sb.toString();
    }

    static String maskKeepLast4(String raw) {
        String compact = raw.replaceAll("[\\s\\-]", "");
        if (compact.length() <= 4) {
            return raw;
        }
        String last4 = compact.substring(compact.length() - 4);
        return "••••" + last4;
    }
}
