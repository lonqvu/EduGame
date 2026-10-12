package com.edugame.question.dto;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * A question to add or to save over an existing one. Fields of the other type are ignored (the teacher may have
 * switched type in the form).
 *
 * @param type          MULTIPLE_CHOICE or SHORT_ANSWER
 * @param options       MULTIPLE_CHOICE: 2-6 different, non-blank texts
 * @param correctOption MULTIPLE_CHOICE: index of the correct option
 * @param answer        SHORT_ANSWER: the expected answer
 */
public record QuestionRequest(
        @NotNull @Pattern(regexp = "MULTIPLE_CHOICE|SHORT_ANSWER", message = "must be MULTIPLE_CHOICE or SHORT_ANSWER")
        String type,
        @NotBlank @Size(max = QuestionSetRules.MAX_TEXT) String text,
        @Size(max = QuestionSetRules.MAX_OPTIONS) List<@NotNull @Size(max = QuestionSetRules.MAX_OPTION_TEXT) String> options,
        Integer correctOption,
        @Size(max = QuestionSetRules.MAX_ANSWER) String answer,
        @Size(max = 500) String explanation) {
}
