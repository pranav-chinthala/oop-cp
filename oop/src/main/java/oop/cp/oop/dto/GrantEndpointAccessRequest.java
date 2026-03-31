package oop.cp.oop.dto;

import jakarta.validation.constraints.NotNull;

public record GrantEndpointAccessRequest(
        @NotNull Long userId,
        @NotNull Long grantedBy,
        boolean canAccess
) {
}
