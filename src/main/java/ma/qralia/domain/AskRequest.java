package ma.qralia.domain;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AskRequest(
        @NotNull ReadResult result,
        @NotBlank String question
) {}
