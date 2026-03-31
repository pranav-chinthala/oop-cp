package oop.cp.oop.repository;

import oop.cp.oop.model.ApiEndpointPermission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ApiEndpointPermissionRepository extends JpaRepository<ApiEndpointPermission, Long> {
    List<ApiEndpointPermission> findByApiEndpoint_Id(Long apiEndpointId);
    Optional<ApiEndpointPermission> findByApiEndpoint_IdAndUser_Id(Long apiEndpointId, Long userId);
}
