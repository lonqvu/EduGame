package com.edugame.question.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Partial update: a {@code null} field is left unchanged; an empty description clears it, grade 0 clears the grade
 * (any grade).
 */
public record UpdateQuestionSetRequest(
        @Size(max = QuestionSetRules.MAX_TITLE) @Pattern(regexp = QuestionSetRules.NOT_BLANK, message = "must not be blank")
        String title,
        @Size(max = 500) String description,
        @Pattern(regexp = QuestionSetRules.SUBJECTS, message = "unknown subject") String subject,
        @Min(0) @Max(12) Short grade) {
}
