package oop.cp.oop.service;

import oop.cp.oop.model.AuditLog;
import oop.cp.oop.model.User;
import oop.cp.oop.repository.AuditLogRepository;
import org.springframework.stereotype.Service;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public void log(User actor, User target, String actionType, String entityType, String entityId, String details) {
        AuditLog log = new AuditLog();
        if (actor != null) {
            log.setActorUserId(actor.getId());
            log.setActorName(actor.getName());
        }
        if (target != null) {
            log.setTargetUserId(target.getId());
            log.setTargetName(target.getName());
        }
        log.setActionType(actionType);
        log.setEntityType(entityType);
        log.setEntityId(entityId);
        log.setDetails(details);
        auditLogRepository.save(log);
    }
}
