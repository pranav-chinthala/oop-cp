package oop.cp.oop.controller;

import oop.cp.oop.dto.ApiResponse;
import oop.cp.oop.model.PmStatus;
import oop.cp.oop.model.User;
import oop.cp.oop.model.UserRole;
import oop.cp.oop.repository.UserRepository;
import oop.cp.oop.service.AuditLogService;
import oop.cp.oop.service.ProjectManagerHistoryService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final ProjectManagerHistoryService projectManagerHistoryService;

    public UserController(UserRepository userRepository,
                          AuditLogService auditLogService,
                          ProjectManagerHistoryService projectManagerHistoryService) {
        this.userRepository = userRepository;
        this.auditLogService = auditLogService;
        this.projectManagerHistoryService = projectManagerHistoryService;
    }

    @GetMapping
    public ResponseEntity<?> listUsers(@RequestParam(required = false) String role, @RequestParam(required = false) String emailLike) {
        if (emailLike != null && !emailLike.isBlank()) {
            return ResponseEntity.ok(userRepository.findByEmailContainingIgnoreCase(emailLike).stream().map(this::toDto).toList());
        }

        if (role != null && !role.isBlank()) {
            try {
                UserRole userRole = UserRole.valueOf(role.toUpperCase());
                return ResponseEntity.ok(userRepository.findByRole(userRole).stream().map(this::toDto).toList());
            } catch (IllegalArgumentException ex) {
                return ResponseEntity.badRequest().body(new ApiResponse("Invalid role"));
            }
        }

        return ResponseEntity.ok(userRepository.findAll().stream().map(this::toDto).toList());
    }

    @PatchMapping("/{userId}/role")
    public ResponseEntity<?> updateRole(@PathVariable Long userId, @RequestParam String role, @RequestParam(required = false) Long actorId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiResponse("User not found"));
        }

        User actor = actorId == null ? null : userRepository.findById(actorId).orElse(null);
        UserRole oldRole = user.getRole();

        try {
            UserRole newRole = UserRole.valueOf(role.toUpperCase());
            user.setRole(newRole);
            userRepository.save(user);

            if (oldRole == UserRole.PROJECT_MANAGER && newRole != UserRole.PROJECT_MANAGER) {
                projectManagerHistoryService.record(user, actor, PmStatus.ROLE_CHANGED, "Role changed to " + newRole.name());
            }
            if (oldRole != UserRole.PROJECT_MANAGER && newRole == UserRole.PROJECT_MANAGER) {
                projectManagerHistoryService.record(user, actor, PmStatus.ACTIVE, "Promoted to project manager");
            }

            auditLogService.log(actor, user, "ROLE_CHANGED", "USER", user.getId().toString(), oldRole.name() + " -> " + newRole.name());
            return ResponseEntity.ok(new ApiResponse("Role updated"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(new ApiResponse("Invalid role"));
        }
    }

    @GetMapping("/{userId}")
    public ResponseEntity<?> getUser(@PathVariable Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiResponse("User not found"));
        }
        return ResponseEntity.ok(toDto(user));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<?> removeUser(@PathVariable Long userId, @RequestParam(required = false) Long actorId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiResponse("User not found"));
        }

        User actor = actorId == null ? null : userRepository.findById(actorId).orElse(null);
        if (user.getRole() == UserRole.PROJECT_MANAGER) {
            projectManagerHistoryService.record(user, actor, PmStatus.REMOVED, "Project manager removed from system");
        }

        auditLogService.log(actor, user, "USER_REMOVED", "USER", user.getId().toString(), "User removed from system");
        userRepository.delete(user);
        return ResponseEntity.ok(new ApiResponse("User removed"));
    }

    private Map<String, Object> toDto(User user) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", user.getId());
        dto.put("name", user.getName());
        dto.put("email", user.getEmail());
        dto.put("role", user.getRole().name());
        dto.put("addedAt", user.getAddedAt());
        dto.put("addedBy", user.getAddedBy() != null ? user.getAddedBy().getId() : null);
        return dto;
    }
}
