package oop.cp.oop.dto;

import java.util.Map;

public record CollectionStatsDto(
        int total,
        Map<String, Integer> methods,
        int folders
) {
}
