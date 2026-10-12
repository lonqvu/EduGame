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

    @Column(name = "school_name", length = 100)
    private String schoolName;

    /** Animal shown for the class ({@link #AVATARS}). */
    @Column(name = "avatar", length = 30)
    private String avatar;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ClassroomStatus status = ClassroomStatus.ACTIVE;

    /** Animals a class can have as its picture. */
    public static final String AVATARS = "bear|rabbit|lion|cat|fox|panda|owl|frog";

    public static Classroom create(String code, User teacher, String name, Short grade) {
        Classroom classroom = new Classroom();
        classroom.code = code;
        classroom.teacher = teacher;
        classroom.name = name;
        classroom.grade = grade;
        return classroom;
    }

    public boolean isOwnedBy(User user) {
        return teacher.getId().equals(user.getId());
    }
}
