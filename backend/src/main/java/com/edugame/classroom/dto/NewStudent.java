package com.edugame.classroom.dto;

import com.edugame.classroom.domain.Classroom;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** @param avatar one of {@link Classroom#AVATARS} (optional) */
public record NewStudent(
        @NotBlank @Size(max = 50) String displayName,
        @Pattern(regexp = Classroom.AVATARS, message = "unknown avatar") String avatar) {
}
