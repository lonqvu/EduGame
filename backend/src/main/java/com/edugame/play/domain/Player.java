package com.edugame.play.domain;

import com.edugame.classroom.domain.ClassroomStudent;
import com.edugame.common.entity.CreatedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** What gets scored in a session: one student or one team. Table {@code player}. */
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "player")
public class Player extends CreatedEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private GameSession session;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false, length = 20)
    private PlayerKind kind;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "classroom_student_id")
    private ClassroomStudent classroomStudent;

    /** Composite FK (team_id, session_id) in DB: the team must be a player of the same session. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id")
    private Player team;

    @Column(name = "display_name", nullable = false, length = 50)
    private String displayName;

    @Column(name = "avatar", length = 50)
    private String avatar;

    @Column(name = "total_score", nullable = false)
    private int totalScore = 0;

    @Column(name = "streak", nullable = false)
    private int streak = 0;

    @Column(name = "best_streak", nullable = false)
    private int bestStreak = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private PlayerStatus status = PlayerStatus.ACTIVE;
}
