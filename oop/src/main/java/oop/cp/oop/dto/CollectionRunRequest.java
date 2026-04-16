package oop.cp.oop.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record CollectionRunRequest(
        @NotEmpty List<CollectionRequestDto> requests,
        Boolean stopOnError
) {
}
