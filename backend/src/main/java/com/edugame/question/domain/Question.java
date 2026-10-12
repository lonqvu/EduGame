package com.edugame.question.domain;

import java.util.ArrayList;
import java.util.List;

import com.edugame.common.entity.AuditableEntity;
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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * A question of a set, at {@code position} 0..n-1. Multiple choice questions have options and the index of the
 * correct one; short answer questions have the expected answer. Table {@code question}.
 */
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "question")
public class Question extends AuditableEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "question_set_id", nullable = false)
    private QuestionSet questionSet;

    @Column(name = "position", nullable = false)
    private int position;

    @Enumerated(EnumType.STRING)
    @Column(name = "question_type", nullable = false, length = 20)
    private QuestionType type;

    @Column(name = "text", nullable = false, length = 500)
    private String text;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "options")
    private List<String> options;

    @Column(name = "correct_option")
    private Short correctOption;

    @Column(name = "answer", length = 200)
    private String answer;

    @Column(name = "explanation", length = 500)
    private String explanation;

    public static Question create(QuestionSet set, int position) {
        Question question = new Question();
        question.questionSet = set;
        question.position = position;
        return question;
    }

    /** Becomes a multiple choice question; the short answer, if any, is dropped. */
    public void makeMultipleChoice(String text, List<String> options, int correctOption, String explanation) {
        this.type = QuestionType.MULTIPLE_CHOICE;
        this.text = text;
        this.options = new ArrayList<>(options);
        this.correctOption = (short) correctOption;
        this.answer = null;
        this.explanation = explanation;
    }

    /** Becomes a short answer question; the options, if any, are dropped. */
    public void makeShortAnswer(String text, String answer, String explanation) {
        this.type = QuestionType.SHORT_ANSWER;
        this.text = text;
        this.options = null;
        this.correctOption = null;
        this.answer = answer;
        this.explanation = explanation;
    }

    /** The same question at {@code position} of another set. */
    public Question copyTo(QuestionSet set, int position) {
        Question copy = create(set, position);
        copy.type = type;
        copy.text = text;
        copy.options = options == null ? null : new ArrayList<>(options);
        copy.correctOption = correctOption;
        copy.answer = answer;
        copy.explanation = explanation;
        return copy;
    }

    /** The text of the correct option, or the expected answer. */
    public String correctAnswer() {
        return type == QuestionType.MULTIPLE_CHOICE ? options.get(correctOption) : answer;
    }
}
