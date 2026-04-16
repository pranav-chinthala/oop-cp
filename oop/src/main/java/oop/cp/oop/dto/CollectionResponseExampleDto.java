package oop.cp.oop.dto;

import java.util.List;

public record CollectionResponseExampleDto(
        String name,
        Integer code,
        String status,
        String body,
        List<CollectionHeaderDto> headers
) {
}
