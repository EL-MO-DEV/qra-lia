package ma.qralia.domain;

import com.fasterxml.jackson.annotation.JsonProperty;

public record RecommendedAction(
        String code,
        @JsonProperty("label_darija") String labelDarija,
        String detail
) {}
