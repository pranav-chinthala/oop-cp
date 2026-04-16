package oop.cp.oop.dto;

import java.util.List;

public record CollectionImportResponse(
        CollectionMetaDto meta,
        CollectionStatsDto stats,
        List<CollectionRequestDto> requests
) {
}
