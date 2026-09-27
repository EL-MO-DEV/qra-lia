package ma.qralia.domain;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Contract with the frontend (CDC §4). Extra fields are additive and safe to ignore.
 */
public record ReadResult(
        String status,
        @JsonProperty("doc_type") String docType,
        String sender,
        Amount amount,
        String deadline,
        @JsonProperty("days_left") Integer daysLeft,
        String action,
        @JsonProperty("risk_level") String riskLevel,
        @JsonProperty("risk_reasons") List<String> riskReasons,
        @JsonProperty("scam_suspected") boolean scamSuspected,
        double confidence,
        @JsonProperty("darija_summary") String darijaSummary,
        String provider,
        @JsonProperty("latency_ms") long latencyMs,
        @JsonProperty("recommended_actions") List<RecommendedAction> recommendedActions
) {}
