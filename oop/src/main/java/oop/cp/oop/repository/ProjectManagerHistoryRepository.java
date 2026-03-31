package oop.cp.oop.repository;

import oop.cp.oop.model.PmStatus;
import oop.cp.oop.model.ProjectManagerHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProjectManagerHistoryRepository extends JpaRepository<ProjectManagerHistory, Long> {
    List<ProjectManagerHistory> findByStatusOrderByChangedAtDesc(PmStatus status);
    List<ProjectManagerHistory> findByUserIdSnapshotOrderByChangedAtDesc(Long userId);
}
