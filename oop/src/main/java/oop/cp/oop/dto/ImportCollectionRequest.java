package oop.cp.oop.dto;

import jakarta.validation.constraints.NotBlank;

public record ImportCollectionRequest(
        @NotBlank String rawJson
) {
}
