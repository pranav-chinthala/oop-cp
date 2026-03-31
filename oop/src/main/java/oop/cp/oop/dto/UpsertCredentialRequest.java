package oop.cp.oop.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UpsertCredentialRequest(
        @NotNull Long resourceServiceId,
        @NotBlank String authMethod,
        @NotBlank String username,
        @NotBlank String secret,
        @NotNull Long updatedBy
) {
}
