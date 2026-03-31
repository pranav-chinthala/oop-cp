package oop.cp.oop.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record SocketEmulatorRequest(
        @NotBlank String host,
        @NotNull Integer port,
        @NotBlank String payload
) {
}
