package oop.cp.oop.repository;

import oop.cp.oop.model.ResourcePermission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ResourcePermissionRepository extends JpaRepository<ResourcePermission, Long> {
    List<ResourcePermission> findByResource_Id(Long resourceId);
    List<ResourcePermission> findByUser_IdAndCanAccessTrue(Long userId);
    Optional<ResourcePermission> findByResource_IdAndUser_Id(Long resourceId, Long userId);
}
