package oop.cp.oop.repository;

import oop.cp.oop.model.ResourceService;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ResourceServiceRepository extends JpaRepository<ResourceService, Long> {
    List<ResourceService> findByResource_Id(Long resourceId);
}
