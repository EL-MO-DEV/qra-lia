package ma.qralia.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import ma.qralia.domain.ModelExtraction;

public final class ExtractionParser {

    private ExtractionParser() {}

    public static ModelExtraction parse(ObjectMapper mapper, String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("empty model output");
        }
        String json = stripFences(raw.trim());
        try {
            JsonNode node = mapper.readTree(json);
            ModelExtraction parsed = mapper.treeToValue(node, ModelExtraction.class);
            validate(parsed);
            return parsed;
        } catch (Exception e) {
            throw new IllegalArgumentException("invalid extraction json", e);
        }
    }

    static String stripFences(String raw) {
        if (raw.startsWith("```")) {
            int firstNl = raw.indexOf('\n');
            int lastFence = raw.lastIndexOf("```");
            if (firstNl > 0 && lastFence > firstNl) {
                return raw.substring(firstNl + 1, lastFence).trim();
            }
        }
        int start = raw.indexOf('{');
        int end = raw.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return raw.substring(start, end + 1);
        }
        return raw;
    }

    static void validate(ModelExtraction parsed) {
        if (parsed == null || parsed.status() == null) {
            throw new IllegalArgumentException("missing status");
        }
        String status = parsed.status();
        if (!status.equals("ok") && !status.equals("unreadable") && !status.equals("not_a_document")) {
            throw new IllegalArgumentException("bad status");
        }
        if (parsed.darijaSummary() == null || parsed.darijaSummary().isBlank()) {
            throw new IllegalArgumentException("missing darija_summary");
        }
        if (parsed.confidence() != null && (parsed.confidence() < 0 || parsed.confidence() > 1)) {
            throw new IllegalArgumentException("confidence out of range");
        }
    }
}
