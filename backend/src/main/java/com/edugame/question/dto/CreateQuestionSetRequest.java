package com.edugame.question.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * @param subject one of {@link com.edugame.question.domain.Subject}
 * @param grade   1-12, or none for any grade
 */
public record CreateQuestionSetRequest(
        @NotBlank @Size(max = QuestionSetRules.MAX_TITLE) String title,
        @Size(max = 500) String description,
        @NotNull @Pattern(regexp = QuestionSetRules.SUBJECTS, message = "unknown subject") String subject,
        @Min(1) @Max(12) Short grade) {
}
