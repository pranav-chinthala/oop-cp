package oop.cp.oop.dto;

import jakarta.validation.constraints.NotNull;

public record ReviewRequestPayload(
        @NotNull Long reviewerId,
        @NotNull Boolean approved,
        String rejectionReason,
        String grantRole
) {
}
