package oop.cp.oop.repository;

import oop.cp.oop.model.Resource;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ResourceRepository extends JpaRepository<Resource, Long> {
    List<Resource> findByProject_Id(Long projectId);
    long countByStatus(oop.cp.oop.model.ResourceStatus status);
}
