package oop.cp.oop.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateApiEndpointRequest(
        @NotBlank String name,
        @NotBlank String httpMethod,
        @NotBlank String url,
        @NotBlank String apiKey,
        boolean projectWideAccess
) {
}
