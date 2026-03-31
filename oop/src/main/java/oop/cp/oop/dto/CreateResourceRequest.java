package oop.cp.oop.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateResourceRequest(
        @NotNull Long projectId,
        @NotBlank String name,
        String resourceType,
        @NotNull Long createdBy
) {
}
