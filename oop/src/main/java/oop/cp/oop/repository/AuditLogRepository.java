package oop.cp.oop.repository;

import oop.cp.oop.model.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findByTargetUserIdOrderByCreatedAtDesc(Long targetUserId);
    List<AuditLog> findByActorUserIdOrderByCreatedAtDesc(Long actorUserId);
}
