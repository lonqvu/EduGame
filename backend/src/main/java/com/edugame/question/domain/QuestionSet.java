package com.edugame.question.domain;

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

/** A teacher's set of questions for a subject and grade. Table {@code question_set}. */
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "question_set")
public class QuestionSet extends AuditableEntity {

    @Column(name = "code", nullable = false, length = 30)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(name = "title", nullable = false, length = 120)
    private String title;

    @Column(name = "description", length = 500)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "subject", nullable = false, length = 30)
    private Subject subject = Subject.KHAC;

    /** 1-12, or none for a set that fits any grade. */
    @Column(name = "grade")
    private Short grade;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private QuestionSetStatus status = QuestionSetStatus.ACTIVE;

    public static QuestionSet create(String code, User owner, String title, Subject subject, Short grade) {
        QuestionSet set = new QuestionSet();
        set.code = code;
        set.owner = owner;
        set.title = title;
        set.subject = subject;
        set.grade = grade;
        return set;
    }

    public boolean isOwnedBy(User user) {
        return owner.getId().equals(user.getId());
    }
}
