package oop.cp.oop.repository;

import oop.cp.oop.model.ResourceCredential;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ResourceCredentialRepository extends JpaRepository<ResourceCredential, Long> {
    Optional<ResourceCredential> findByResourceService_Id(Long resourceServiceId);
    List<ResourceCredential> findByResourceService_Resource_Id(Long resourceId);
}
