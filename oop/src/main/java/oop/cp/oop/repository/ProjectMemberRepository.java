package oop.cp.oop.repository;

import oop.cp.oop.model.ProjectMember;
import oop.cp.oop.model.ProjectMemberId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProjectMemberRepository extends JpaRepository<ProjectMember, ProjectMemberId> {
    List<ProjectMember> findByProject_Id(Long projectId);
    List<ProjectMember> findByUser_Id(Long userId);
}
