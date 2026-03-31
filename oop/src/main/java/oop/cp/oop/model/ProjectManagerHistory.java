package oop.cp.oop.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "project_manager_history")
public class ProjectManagerHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id_snapshot", nullable = false)
    private Long userIdSnapshot;

    @Column(name = "user_name_snapshot", nullable = false)
    private String userNameSnapshot;

    @Column(name = "user_email_snapshot", nullable = false)
    private String userEmailSnapshot;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PmStatus status;

    @Column(name = "changed_by_user_id")
    private Long changedByUserId;

    @Column(name = "changed_by_name")
    private String changedByName;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "changed_at", nullable = false)
    private LocalDateTime changedAt = LocalDateTime.now();

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserIdSnapshot() {
        return userIdSnapshot;
    }

    public void setUserIdSnapshot(Long userIdSnapshot) {
        this.userIdSnapshot = userIdSnapshot;
    }

    public String getUserNameSnapshot() {
        return userNameSnapshot;
    }

    public void setUserNameSnapshot(String userNameSnapshot) {
        this.userNameSnapshot = userNameSnapshot;
    }

    public String getUserEmailSnapshot() {
        return userEmailSnapshot;
    }

    public void setUserEmailSnapshot(String userEmailSnapshot) {
        this.userEmailSnapshot = userEmailSnapshot;
    }

    public PmStatus getStatus() {
        return status;
    }

    public void setStatus(PmStatus status) {
        this.status = status;
    }

    public Long getChangedByUserId() {
        return changedByUserId;
    }

    public void setChangedByUserId(Long changedByUserId) {
        this.changedByUserId = changedByUserId;
    }

    public String getChangedByName() {
        return changedByName;
    }

    public void setChangedByName(String changedByName) {
        this.changedByName = changedByName;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public LocalDateTime getChangedAt() {
        return changedAt;
    }

    public void setChangedAt(LocalDateTime changedAt) {
        this.changedAt = changedAt;
    }
}
