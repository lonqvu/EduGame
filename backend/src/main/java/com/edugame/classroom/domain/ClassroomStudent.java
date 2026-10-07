package com.edugame.classroom.domain;

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

/** A student on a class list. Only a nickname and avatar are stored. Table {@code classroom_student}. */
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "classroom_student")
public class ClassroomStudent extends CreatedEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "classroom_id", nullable = false)
    private Classroom classroom;

    @Column(name = "display_name", nullable = false, length = 50)
    private String displayName;

    @Column(name = "avatar", length = 50)
    private String avatar;

    @Column(name = "roll_number")
    private Short rollNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ClassroomStudentStatus status = ClassroomStudentStatus.ACTIVE;
}
