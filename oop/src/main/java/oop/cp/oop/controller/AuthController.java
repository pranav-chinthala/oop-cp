package oop.cp.oop.controller;

import jakarta.validation.Valid;
import oop.cp.oop.dto.ApiResponse;
import oop.cp.oop.dto.LoginRequest;
import oop.cp.oop.dto.LoginResponse;
import oop.cp.oop.dto.RequestAccessRequest;
import oop.cp.oop.model.AccessRequest;
import oop.cp.oop.model.AccessRequestStatus;
import oop.cp.oop.model.User;
import oop.cp.oop.model.UserRole;
import oop.cp.oop.repository.AccessRequestRepository;
import oop.cp.oop.repository.UserRepository;
import oop.cp.oop.service.AuditLogService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final AccessRequestRepository accessRequestRepository;
    private final AuditLogService auditLogService;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public AuthController(UserRepository userRepository,
                          AccessRequestRepository accessRequestRepository,
                          AuditLogService auditLogService) {
        this.userRepository = userRepository;
        this.accessRequestRepository = accessRequestRepository;
        this.auditLogService = auditLogService;
    }

    @PostMapping("/request-access")
    public ResponseEntity<ApiResponse> requestAccess(@Valid @RequestBody RequestAccessRequest request) {
        if (!request.password().equals(request.confirmPassword())) {
            return ResponseEntity.badRequest().body(new ApiResponse("Passwords do not match"));
        }

        if (userRepository.findByEmailIgnoreCase(request.email()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiResponse("User already exists"));
        }

        User user = new User();
        user.setName(request.name());
        user.setEmail(request.email().toLowerCase());
        user.setPasswordHash(encoder.encode(request.password()));
        user.setRole(UserRole.PENDING);
        userRepository.save(user);

        AccessRequest accessRequest = new AccessRequest();
        accessRequest.setUser(user);
        accessRequest.setRequestReason(request.reason() == null || request.reason().isBlank() ? "General access request" : request.reason());
        accessRequestRepository.save(accessRequest);

        auditLogService.log(user, user, "ACCESS_REQUEST_CREATED", "ACCESS_REQUEST", accessRequest.getId().toString(), accessRequest.getRequestReason());

        return ResponseEntity.status(HttpStatus.CREATED).body(new ApiResponse("Access requested successfully"));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        User user = userRepository.findByEmailIgnoreCase(request.email())
                .orElse(null);

        if (user == null || !encoder.matches(request.password(), user.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ApiResponse("Invalid credentials"));
        }

        if (user.getRole() == UserRole.PENDING) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ApiResponse("Access not granted yet"));
        }

        if (user.getRole() == UserRole.DENIED) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ApiResponse("Access denied"));
        }

        return ResponseEntity.ok(new LoginResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole().name(),
                "Login successful"
        ));
    }

    @GetMapping("/me/{userId}")
    public ResponseEntity<?> me(@PathVariable Long userId) {
        return userRepository.findById(userId)
                .<ResponseEntity<?>>map(user -> ResponseEntity.ok(Map.of(
                        "id", user.getId(),
                        "name", user.getName(),
                        "email", user.getEmail(),
                        "role", user.getRole().name()
                )))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiResponse("User not found")));
    }
}
