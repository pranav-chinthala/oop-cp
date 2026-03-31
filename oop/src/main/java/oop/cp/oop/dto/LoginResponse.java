package oop.cp.oop.dto;

public record LoginResponse(
        Long userId,
        String name,
        String email,
        String role,
        String message
) {
}
