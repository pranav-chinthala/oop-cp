package oop.cp.oop.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.Map;

public record HttpEmulatorRequest(
        @NotBlank String method,
        @NotBlank String url,
        Map<String, String> headers,
        String body
) {
}
