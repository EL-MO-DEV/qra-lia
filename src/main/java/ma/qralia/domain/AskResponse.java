package ma.qralia.domain;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AskResponse(
        String answer,
        @JsonProperty("based_on_document") boolean basedOnDocument,
        String provider
) {}
