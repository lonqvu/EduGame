package com.edugame.reward.domain;

import com.edugame.classroom.domain.ClassroomStudent;
import com.edugame.common.entity.CreatedEntity;
import com.edugame.play.domain.GameSession;
import com.edugame.user.domain.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Stars a student earns (or loses) across sessions. Table {@code student_point}. */
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "student_point")
public class StudentPoint extends CreatedEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "classroom_student_id", nullable = false)
    private ClassroomStudent classroomStudent;

    /** NULL for stars given outside a game. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id")
    private GameSession session;

    /** Never 0; negative when the teacher takes stars away. */
    @Column(name = "points", nullable = false)
    private Integer points;

    @Column(name = "reason", length = 100)
    private String reason;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    public static StudentPoint of(ClassroomStudent student, int points, String reason, User createdBy) {
        StudentPoint point = new StudentPoint();
        point.classroomStudent = student;
        point.points = points;
        point.reason = reason;
        point.createdBy = createdBy;
        return point;
    }
}
