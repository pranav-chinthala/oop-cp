package oop.cp.oop.repository;

import oop.cp.oop.model.ApiEndpoint;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ApiEndpointRepository extends JpaRepository<ApiEndpoint, Long> {
    List<ApiEndpoint> findByResource_Id(Long resourceId);
}
