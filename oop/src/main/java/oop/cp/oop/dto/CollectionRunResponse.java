package oop.cp.oop.dto;

import java.util.List;

public record CollectionRunResponse(
        int total,
        int succeeded,
        int failed,
        long totalDurationMs,
        List<CollectionRunItemResultDto> results
) {
}
