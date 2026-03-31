package oop.cp.oop.dto;

import jakarta.validation.constraints.NotNull;

public record AddMemberRequest(
        @NotNull Long userId,
        @NotNull Long addedBy,
        String role
) {
}
