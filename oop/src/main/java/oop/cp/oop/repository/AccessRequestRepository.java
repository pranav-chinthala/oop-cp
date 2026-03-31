package oop.cp.oop.repository;

import oop.cp.oop.model.AccessRequest;
import oop.cp.oop.model.AccessRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AccessRequestRepository extends JpaRepository<AccessRequest, Long> {
    List<AccessRequest> findByStatusOrderByRequestedAtDesc(AccessRequestStatus status);
    Optional<AccessRequest> findTopByUser_IdOrderByRequestedAtDesc(Long userId);
    long countByStatus(AccessRequestStatus status);
}
