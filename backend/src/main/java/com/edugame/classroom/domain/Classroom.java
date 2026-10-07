package com.edugame.classroom.domain;

import com.edugame.common.entity.AuditableEntity;
import com.edugame.user.domain.User;
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

/** A teacher's class, reused across sessions. Table {@code classroom}. */
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "classroom")
public class Classroom extends AuditableEntity {

    @Column(name = "code", nullable = false, length = 30)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "teacher_id", nullable = false)
    private User teacher;

    @Column(name = "name", nullable = false, length = 50)
    private String name;

    @Column(name = "grade", nullable = false)
    private Short grade;

    @Column(name = "school_year", length = 9)
    private String schoolYear;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ClassroomStatus status = ClassroomStatus.ACTIVE;
}
