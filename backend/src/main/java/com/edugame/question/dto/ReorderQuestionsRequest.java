package com.edugame.question.dto;

import java.util.List;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

/** Every question id of the set, in the new order. */
public record ReorderQuestionsRequest(@NotEmpty List<@NotNull Long> questionIds) {
}
