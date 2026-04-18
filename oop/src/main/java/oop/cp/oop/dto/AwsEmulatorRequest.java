package oop.cp.oop.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.Map;

public record AwsEmulatorRequest(
        @NotBlank String service,
        @NotBlank String action,
        String resourceName,
        Map<String, Object> parameters
) {
}
