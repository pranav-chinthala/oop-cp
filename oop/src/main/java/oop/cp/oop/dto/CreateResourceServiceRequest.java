package oop.cp.oop.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateResourceServiceRequest(
        @NotBlank String serviceProtocol,
        @NotBlank String ipAddress,
        @NotNull Integer port,
        String connectionMetadata
) {
}
