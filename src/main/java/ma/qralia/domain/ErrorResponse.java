package ma.qralia.domain;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(
        String error,
        @JsonProperty("darija_message") String darijaMessage
) {
    public static ErrorResponse of(String error) {
        return new ErrorResponse(error, null);
    }

    public static ErrorResponse aiUnavailable() {
        return new ErrorResponse(
                "ai_unavailable",
                "ما قدرناش نقراو الورقة دابا، عاود من بعد شوية."
        );
    }
}
