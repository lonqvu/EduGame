package com.edugame.classroom.dto;

import java.util.List;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

/** Every student id of the class, in the new roll call order (roll numbers become 1..n). */
public record ReorderStudentsRequest(@NotEmpty List<@NotNull Long> studentIds) {
}
