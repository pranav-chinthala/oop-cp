package oop.cp.oop.controller;

import oop.cp.oop.dto.ApiResponse;
import oop.cp.oop.model.ProjectMember;
import oop.cp.oop.model.Resource;
import oop.cp.oop.model.ResourceStatus;
import oop.cp.oop.model.User;
import oop.cp.oop.model.UserRole;
import oop.cp.oop.repository.ProjectMemberRepository;
import oop.cp.oop.repository.ProjectRepository;
import oop.cp.oop.repository.ResourceRepository;
import oop.cp.oop.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashSet;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final ResourceRepository resourceRepository;
    private final ProjectMemberRepository projectMemberRepository;

    public DashboardController(UserRepository userRepository,
                               ProjectRepository projectRepository,
                               ResourceRepository resourceRepository,
                               ProjectMemberRepository projectMemberRepository) {
        this.userRepository = userRepository;
        this.projectRepository = projectRepository;
        this.resourceRepository = resourceRepository;
        this.projectMemberRepository = projectMemberRepository;
    }

    @GetMapping("/{userId}")
    public ResponseEntity<?> dashboard(@PathVariable Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiResponse("User not found"));
        }

        if (user.getRole() == UserRole.SUPER_ADMIN) {
            return ResponseEntity.ok(Map.of(
                    "projects", projectRepository.count(),
                    "projectManagers", userRepository.countByRole(UserRole.PROJECT_MANAGER),
                    "employees", userRepository.countByRole(UserRole.EMPLOYEE),
                    "resources", resourceRepository.count(),
                    "provisioned", resourceRepository.countByStatus(ResourceStatus.PROVISIONED),
                    "maintenance", resourceRepository.countByStatus(ResourceStatus.MAINTENANCE),
                    "decommissioned", resourceRepository.countByStatus(ResourceStatus.DECOMMISSIONED)
            ));
        }

        Set<Long> projectIds = new HashSet<>();
        for (ProjectMember member : projectMemberRepository.findByUser_Id(userId)) {
            projectIds.add(member.getProject().getId());
        }

        Set<Long> resourceIds = new HashSet<>();
        for (Long projectId : projectIds) {
            for (Resource resource : resourceRepository.findByProject_Id(projectId)) {
                resourceIds.add(resource.getId());
            }
        }

        return ResponseEntity.ok(Map.of(
                "projects", projectIds.size(),
                "projectManagers", user.getRole() == UserRole.PROJECT_MANAGER ? 1 : 0,
                "employees", user.getRole() == UserRole.EMPLOYEE ? 1 : 0,
                "resources", resourceIds.size()
        ));
    }
}
