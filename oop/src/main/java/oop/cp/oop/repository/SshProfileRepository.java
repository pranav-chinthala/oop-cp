package oop.cp.oop.repository;

import oop.cp.oop.model.SshProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SshProfileRepository extends JpaRepository<SshProfile, Long> {
    List<SshProfile> findByUser_IdOrderByUpdatedAtDesc(Long userId);
    Optional<SshProfile> findByUser_IdAndNameIgnoreCase(Long userId, String name);
}
