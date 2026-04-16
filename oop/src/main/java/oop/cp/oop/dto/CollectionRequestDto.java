package oop.cp.oop.dto;

import java.util.List;

public record CollectionRequestDto(
        String id,
        String name,
        String folder,
        String method,
        String url,
        List<CollectionHeaderDto> headers,
        String body,
        String description,
        List<CollectionQueryParamDto> queryParams,
        List<CollectionResponseExampleDto> responses
) {
}
