package oop.cp.oop.controller;

import oop.cp.oop.model.PmStatus;
import oop.cp.oop.model.ProjectManagerHistory;
import oop.cp.oop.repository.ProjectManagerHistoryRepository;
import oop.cp.oop.repository.UserRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users/project-managers")
public class ProjectManagerHistoryController {

    private final ProjectManagerHistoryRepository projectManagerHistoryRepository;
    private final UserRepository userRepository;

    public ProjectManagerHistoryController(ProjectManagerHistoryRepository projectManagerHistoryRepository,
                                           UserRepository userRepository) {
        this.projectManagerHistoryRepository = projectManagerHistoryRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/buckets")
    public Map<String, Object> buckets() {
        List<Map<String, Object>> active = userRepository.findByRole(oop.cp.oop.model.UserRole.PROJECT_MANAGER)
                .stream().map(user -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", user.getId());
                    map.put("name", user.getName());
                    map.put("email", user.getEmail());
                    map.put("role", user.getRole().name());
                    map.put("addedAt", user.getAddedAt());
                    return map;
                }).toList();

        List<Map<String, Object>> past = projectManagerHistoryRepository.findByStatusOrderByChangedAtDesc(PmStatus.ROLE_CHANGED)
                .stream().map(this::toDto).toList();

        List<Map<String, Object>> removed = projectManagerHistoryRepository.findByStatusOrderByChangedAtDesc(PmStatus.REMOVED)
                .stream().map(this::toDto).toList();

        Map<String, Object> payload = new HashMap<>();
        payload.put("active", active);
        payload.put("past", past);
        payload.put("removed", removed);
        return payload;
    }

    private Map<String, Object> toDto(ProjectManagerHistory history) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", history.getId());
        map.put("userId", history.getUserIdSnapshot());
        map.put("name", history.getUserNameSnapshot());
        map.put("email", history.getUserEmailSnapshot());
        map.put("status", history.getStatus().name());
        map.put("changedByUserId", history.getChangedByUserId());
        map.put("changedByName", history.getChangedByName());
        map.put("note", history.getNote());
        map.put("changedAt", history.getChangedAt());
        return map;
    }
}
