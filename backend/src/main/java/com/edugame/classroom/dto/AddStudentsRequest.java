package com.edugame.classroom.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

/** Students added at the end of the class list, in this order (one, or a pasted list). */
public record AddStudentsRequest(
        @NotEmpty @Size(max = ClassroomRules.MAX_STUDENTS) List<@Valid NewStudent> students) {
}
