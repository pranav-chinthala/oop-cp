package oop.cp.oop.dto;

public record CollectionQueryParamDto(
        String key,
        String value,
        String description,
        boolean disabled
) {
}
