package ma.qralia.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ModelExtraction(
        String status,
        @JsonProperty("doc_type") String docType,
        String sender,
        Amount amount,
        String deadline,
        String action,
        @JsonProperty("risk_level") String riskLevel,
        @JsonProperty("risk_reasons") List<String> riskReasons,
        @JsonProperty("scam_suspected") Boolean scamSuspected,
        Double confidence,
        @JsonProperty("darija_summary") String darijaSummary
) {
    public ReadResult toReadResult(String provider, long latencyMs) {
        return new ReadResult(
                status,
                docType,
                sender,
                amount,
                deadline,
                null,
                action,
                riskLevel,
                riskReasons == null ? List.of() : riskReasons,
                Boolean.TRUE.equals(scamSuspected),
                confidence == null ? 0.0 : confidence,
                darijaSummary,
                provider,
                latencyMs,
                List.of()
        );
    }
}
