package ma.qralia.domain;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ReadRequest(
        @NotBlank
        @JsonProperty("imageBase64")
        String imageBase64,

        @NotBlank
        @Pattern(regexp = "image/(jpeg|png|webp)", message = "mime type not allowed")
        @JsonProperty("mimeType")
        String mimeType
) {}
