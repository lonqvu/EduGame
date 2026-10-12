package com.edugame.question.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

/** Questions added at the end of the set, in this order (one, or a pasted list). All or none are saved. */
public record AddQuestionsRequest(
        @NotEmpty @Size(max = QuestionSetRules.MAX_QUESTIONS) List<@Valid QuestionRequest> questions) {
}
