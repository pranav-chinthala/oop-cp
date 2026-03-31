package oop.cp.oop.controller;

import jakarta.validation.Valid;
import oop.cp.oop.dto.AddMemberRequest;
import oop.cp.oop.dto.ApiResponse;
import oop.cp.oop.dto.CreateProjectRequest;
import oop.cp.oop.model.*;
import oop.cp.oop.repository.ProjectMemberRepository;
import oop.cp.oop.repository.ProjectRepository;
import oop.cp.oop.repository.UserRepository;
import oop.cp.oop.service.AuditLogService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final AuditLogService auditLogService;

    public ProjectController(ProjectRepository projectRepository,
                             UserRepository userRepository,
                             ProjectMemberRepository projectMemberRepository,
                             AuditLogService auditLogService) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public ResponseEntity<?> listProjects(@RequestParam Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiResponse("User not found"));
        }

        if (user.getRole() == UserRole.SUPER_ADMIN) {
            return ResponseEntity.ok(projectRepository.findAll().stream().map(this::toProjectDto).toList());
        }

        List<ProjectMember> memberships = projectMemberRepository.findByUser_Id(userId);
        Set<Long> projectIds = new HashSet<>();
        memberships.forEach(member -> projectIds.add(member.getProject().getId()));

        List<Map<String, Object>> projects = projectRepository.findAllById(projectIds).stream().map(this::toProjectDto).toList();
        return ResponseEntity.ok(projects);
    }

    @GetMapping("/{projectId}")
    public ResponseEntity<?> getProject(@PathVariable Long projectId) {
        Project project = projectRepository.findById(projectId).orElse(null);
        if (project == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiResponse("Project not found"));
        }

        Map<String, Object> response = toProjectDto(project);
        List<Map<String, Object>> members = projectMemberRepository.findByProject_Id(projectId)
                .stream()
            .map(member -> {
                Map<String, Object> map = new HashMap<>();
                map.put("userId", member.getUser().getId());
                map.put("name", member.getUser().getName());
                map.put("email", member.getUser().getEmail());
                map.put("role", member.getRole());
                map.put("addedBy", member.getAddedBy().getId());
                return map;
            }).toList();

        response.put("members", members);
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<?> createProject(@Valid @RequestBody CreateProjectRequest request) {
        User creator = userRepository.findById(request.createdBy()).orElse(null);
        if (creator == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiResponse("Creator not found"));
        }

        if (creator.getRole() == UserRole.EMPLOYEE || creator.getRole() == UserRole.PENDING || creator.getRole() == UserRole.DENIED) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ApiResponse("You cannot create projects"));
        }

        Project project = new Project();
        project.setName(request.name());
        project.setDescription(request.description());
        project.setCreatedBy(creator);
        Project saved = projectRepository.save(project);
        auditLogService.log(creator, creator, "PROJECT_CREATED", "PROJECT", saved.getId().toString(), saved.getName());

        if (request.managerUserId() != null) {
            User manager = userRepository.findById(request.managerUserId()).orElse(null);
            if (manager != null) {
                ProjectMember member = new ProjectMember();
                member.setId(new ProjectMemberId(saved.getId(), manager.getId()));
                member.setProject(saved);
                member.setUser(manager);
                member.setRole("Manager");
                member.setAddedBy(creator);
                projectMemberRepository.save(member);
            }
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(toProjectDto(saved));
    }

    @PostMapping("/{projectId}/members")
    public ResponseEntity<?> addMember(@PathVariable Long projectId, @Valid @RequestBody AddMemberRequest request) {
        Project project = projectRepository.findById(projectId).orElse(null);
        User user = userRepository.findById(request.userId()).orElse(null);
        User addedBy = userRepository.findById(request.addedBy()).orElse(null);

        if (project == null || user == null || addedBy == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiResponse("Project or user not found"));
        }

        ProjectMemberId id = new ProjectMemberId(projectId, request.userId());
        if (projectMemberRepository.findById(id).isPresent()) {
            return ResponseEntity.badRequest().body(new ApiResponse("User already in project"));
        }

        ProjectMember member = new ProjectMember();
        member.setId(id);
        member.setProject(project);
        member.setUser(user);
        member.setRole(request.role() == null || request.role().isBlank() ? "Member" : request.role());
        member.setAddedBy(addedBy);
        projectMemberRepository.save(member);

        auditLogService.log(addedBy, user, "PROJECT_MEMBER_ADDED", "PROJECT", project.getId().toString(), "Added to project " + project.getName());

        return ResponseEntity.status(HttpStatus.CREATED).body(new ApiResponse("Member added"));
    }

    @DeleteMapping("/{projectId}/members/{userId}")
    public ResponseEntity<ApiResponse> removeMember(@PathVariable Long projectId, @PathVariable Long userId) {
        ProjectMemberId id = new ProjectMemberId(projectId, userId);
        if (projectMemberRepository.findById(id).isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiResponse("Member not found in project"));
        }
        Project project = projectRepository.findById(projectId).orElse(null);
        User target = userRepository.findById(userId).orElse(null);
        if (project != null && target != null) {
            auditLogService.log(null, target, "PROJECT_MEMBER_REMOVED", "PROJECT", projectId.toString(), "Removed from project " + project.getName());
        }
        projectMemberRepository.deleteById(id);
        return ResponseEntity.ok(new ApiResponse("Member removed"));
    }

    @RequestMapping(value = "/{projectId}", method = {RequestMethod.PATCH, RequestMethod.PUT})
    public ResponseEntity<?> updateProject(@PathVariable Long projectId, @RequestBody Map<String, Object> payload) {
        Project project = projectRepository.findById(projectId).orElse(null);
        if (project == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiResponse("Project not found"));
        }

        User actor = null;
        Object actorIdRaw = payload.get("actorId");
        if (actorIdRaw instanceof Number actorIdNumber) {
            actor = userRepository.findById(actorIdNumber.longValue()).orElse(null);
        }

        if (payload.containsKey("name")) {
            Object nameRaw = payload.get("name");
            if (nameRaw instanceof String name && !name.isBlank()) {
                project.setName(name.trim());
            }
        }

        if (payload.containsKey("description")) {
            Object descriptionRaw = payload.get("description");
            if (descriptionRaw instanceof String description) {
                project.setDescription(description.trim());
            }
        }

        if (payload.containsKey("status")) {
            Object statusRaw = payload.get("status");
            if (statusRaw instanceof String statusValue && !statusValue.isBlank()) {
                try {
                    ProjectStatus status = ProjectStatus.valueOf(statusValue.trim().toUpperCase());
                    project.setStatus(status);

                    if (status == ProjectStatus.FINISHED && project.getFinishedAt() == null) {
                        project.setFinishedAt(LocalDateTime.now());
                    }
                    if (status == ProjectStatus.CANCELLED && project.getCancelledAt() == null) {
                        project.setCancelledAt(LocalDateTime.now());
                    }
                    if (status != ProjectStatus.FINISHED) {
                        project.setFinishedAt(null);
                    }
                    if (status != ProjectStatus.CANCELLED) {
                        project.setCancelledAt(null);
                    }
                } catch (IllegalArgumentException ex) {
                    return ResponseEntity.badRequest().body(new ApiResponse("Invalid status"));
                }
            }
        }

        Project saved = projectRepository.save(project);
        if (actor != null) {
            auditLogService.log(actor, actor, "PROJECT_UPDATED", "PROJECT", saved.getId().toString(), saved.getName());
        }
        return ResponseEntity.ok(toProjectDto(saved));
    }

    private Map<String, Object> toProjectDto(Project project) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", project.getId());
        map.put("name", project.getName());
        map.put("description", project.getDescription());
        map.put("status", project.getStatus().name());
        map.put("createdBy", project.getCreatedBy().getId());
        map.put("createdByName", project.getCreatedBy().getName());
        map.put("createdAt", project.getCreatedAt());
        map.put("finishedAt", project.getFinishedAt());
        map.put("cancelledAt", project.getCancelledAt());
        return map;
    }
}
