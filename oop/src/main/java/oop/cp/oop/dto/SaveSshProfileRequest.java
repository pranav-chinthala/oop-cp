package oop.cp.oop.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record SaveSshProfileRequest(
        @NotNull Long userId,
        @NotBlank String name,
        @NotBlank String host,
        @NotNull Integer port,
        @NotBlank String username,
        @NotBlank String ptyType
) {
}
