package com.edugame.classroom.dto;

import com.edugame.classroom.domain.Classroom;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Partial update of a student; {@code null} fields are left unchanged. */
public record UpdateStudentRequest(
        @Size(max = 50) @Pattern(regexp = "(?s).*\\S.*", message = "must not be blank") String displayName,
        @Pattern(regexp = Classroom.AVATARS, message = "unknown avatar") String avatar) {
}
