package oop.cp.oop.controller;

import jakarta.validation.Valid;
import oop.cp.oop.dto.ApiResponse;
import oop.cp.oop.dto.ReviewRequestPayload;
import oop.cp.oop.model.AccessRequest;
import oop.cp.oop.model.AccessRequestStatus;
import oop.cp.oop.model.PmStatus;
import oop.cp.oop.model.User;
import oop.cp.oop.model.UserRole;
import oop.cp.oop.repository.AccessRequestRepository;
import oop.cp.oop.repository.UserRepository;
import oop.cp.oop.service.AuditLogService;
import oop.cp.oop.service.ProjectManagerHistoryService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/requests")
public class AccessRequestController {

    private final AccessRequestRepository accessRequestRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final ProjectManagerHistoryService projectManagerHistoryService;

    public AccessRequestController(AccessRequestRepository accessRequestRepository,
                                   UserRepository userRepository,
                                   AuditLogService auditLogService,
                                   ProjectManagerHistoryService projectManagerHistoryService) {
        this.accessRequestRepository = accessRequestRepository;
        this.userRepository = userRepository;
        this.auditLogService = auditLogService;
        this.projectManagerHistoryService = projectManagerHistoryService;
    }

    @GetMapping("/pending")
    @Transactional(readOnly = true)
    public List<Map<String, Object>> pendingRequests() {
        return accessRequestRepository.findByStatusOrderByRequestedAtDesc(AccessRequestStatus.PENDING)
                .stream()
                .map(request -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", request.getId());
                    map.put("userId", request.getUser().getId());
                    map.put("name", request.getUser().getName());
                    map.put("email", request.getUser().getEmail());
                    map.put("reason", request.getRequestReason());
                    map.put("requestedAt", request.getRequestedAt());
                    return map;
                })
                .toList();
    }

    @PostMapping("/{requestId}/review")
    public ResponseEntity<?> reviewRequest(@PathVariable Long requestId, @Valid @RequestBody ReviewRequestPayload payload) {
        User reviewer = userRepository.findById(payload.reviewerId()).orElse(null);
        if (reviewer == null || reviewer.getRole() != UserRole.SUPER_ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ApiResponse("Only super admins can review requests"));
        }

        AccessRequest accessRequest = accessRequestRepository.findById(requestId).orElse(null);
        if (accessRequest == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiResponse("Request not found"));
        }

        if (accessRequest.getStatus() != AccessRequestStatus.PENDING) {
            return ResponseEntity.badRequest().body(new ApiResponse("Request already reviewed"));
        }

        User user = accessRequest.getUser();
        if (Boolean.TRUE.equals(payload.approved())) {
            UserRole grantRole = UserRole.EMPLOYEE;
            if (payload.grantRole() != null && !payload.grantRole().isBlank()) {
                try {
                    grantRole = UserRole.valueOf(payload.grantRole().trim().toUpperCase());
                } catch (IllegalArgumentException ignored) {
                    return ResponseEntity.badRequest().body(new ApiResponse("Invalid role"));
                }
            }
            if (grantRole == UserRole.PENDING || grantRole == UserRole.DENIED) {
                return ResponseEntity.badRequest().body(new ApiResponse("Invalid role for granted user"));
            }
            user.setRole(grantRole);
            user.setAddedBy(reviewer);
            accessRequest.setStatus(AccessRequestStatus.APPROVED);

            if (grantRole == UserRole.PROJECT_MANAGER) {
                projectManagerHistoryService.record(user, reviewer, PmStatus.ACTIVE, "Granted access as project manager");
            }

            auditLogService.log(reviewer, user, "ACCESS_REQUEST_APPROVED", "ACCESS_REQUEST", accessRequest.getId().toString(), "Granted role: " + grantRole.name());
        } else {
            user.setRole(UserRole.DENIED);
            accessRequest.setStatus(AccessRequestStatus.REJECTED);
            accessRequest.setRejectionReason(payload.rejectionReason());
            auditLogService.log(reviewer, user, "ACCESS_REQUEST_REJECTED", "ACCESS_REQUEST", accessRequest.getId().toString(), payload.rejectionReason());
        }

        accessRequest.setReviewedBy(reviewer);
        accessRequest.setReviewedAt(LocalDateTime.now());
        userRepository.save(user);
        accessRequestRepository.save(accessRequest);

        return ResponseEntity.ok(new ApiResponse("Request reviewed successfully"));
    }
}
