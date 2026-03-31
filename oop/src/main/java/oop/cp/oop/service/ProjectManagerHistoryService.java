package oop.cp.oop.service;

import oop.cp.oop.model.PmStatus;
import oop.cp.oop.model.ProjectManagerHistory;
import oop.cp.oop.model.User;
import oop.cp.oop.repository.ProjectManagerHistoryRepository;
import org.springframework.stereotype.Service;

@Service
public class ProjectManagerHistoryService {

    private final ProjectManagerHistoryRepository projectManagerHistoryRepository;

    public ProjectManagerHistoryService(ProjectManagerHistoryRepository projectManagerHistoryRepository) {
        this.projectManagerHistoryRepository = projectManagerHistoryRepository;
    }

    public void record(User targetUser, User changedBy, PmStatus status, String note) {
        if (targetUser == null) {
            return;
        }
        ProjectManagerHistory history = new ProjectManagerHistory();
        history.setUserIdSnapshot(targetUser.getId());
        history.setUserNameSnapshot(targetUser.getName());
        history.setUserEmailSnapshot(targetUser.getEmail());
        history.setStatus(status);
        history.setNote(note);
        if (changedBy != null) {
            history.setChangedByUserId(changedBy.getId());
            history.setChangedByName(changedBy.getName());
        }
        projectManagerHistoryRepository.save(history);
    }
}
