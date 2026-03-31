package oop.cp.oop.controller;

import oop.cp.oop.model.AuditLog;
import oop.cp.oop.repository.AuditLogRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/audit")
public class AuditController {

    private final AuditLogRepository auditLogRepository;

    public AuditController(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @GetMapping
    public List<Map<String, Object>> getLogs(@RequestParam(required = false) Long userId) {
        List<AuditLog> logs;
        if (userId == null) {
            logs = auditLogRepository.findAll();
        } else {
            logs = new ArrayList<>();
            logs.addAll(auditLogRepository.findByTargetUserIdOrderByCreatedAtDesc(userId));
            logs.addAll(auditLogRepository.findByActorUserIdOrderByCreatedAtDesc(userId));
            logs.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));
        }

        return logs.stream().map(log -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", log.getId());
            map.put("actorUserId", log.getActorUserId());
            map.put("actorName", log.getActorName());
            map.put("targetUserId", log.getTargetUserId());
            map.put("targetName", log.getTargetName());
            map.put("actionType", log.getActionType());
            map.put("entityType", log.getEntityType());
            map.put("entityId", log.getEntityId());
            map.put("details", log.getDetails());
            map.put("createdAt", log.getCreatedAt());
            return map;
        }).toList();
    }
}
