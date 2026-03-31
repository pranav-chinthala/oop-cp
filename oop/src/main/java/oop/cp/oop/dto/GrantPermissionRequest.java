package oop.cp.oop.dto;

import jakarta.validation.constraints.NotNull;

public record GrantPermissionRequest(
        @NotNull Long userId,
        @NotNull Long grantedBy,
        boolean canAccess,
        boolean canGrantAccess
) {
}
