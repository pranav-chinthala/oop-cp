package oop.cp.oop.dto;

import java.util.List;
import java.util.Map;

public record CollectionRunItemResultDto(
        String id,
        String name,
        String method,
        String url,
        Integer statusCode,
        String body,
        Map<String, List<String>> headers,
        long durationMs,
        int sizeBytes,
        String error
) {
}
