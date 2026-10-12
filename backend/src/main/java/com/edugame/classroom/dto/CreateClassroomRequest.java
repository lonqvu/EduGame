package com.edugame.classroom.dto;

import com.edugame.classroom.domain.Classroom;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * @param name       "3A", "Lớp 1 Sao Mai"; one name per teacher and school year
 * @param schoolYear "2026-2027" (optional)
 * @param avatar     one of {@link Classroom#AVATARS} (optional)
 */
public record CreateClassroomRequest(
        @NotBlank @Size(max = 50) String name,
        @NotNull @Min(1) @Max(12) Short grade,
        @Pattern(regexp = ClassroomRules.SCHOOL_YEAR, message = "must look like 2026-2027") String schoolYear,
        @Size(max = 100) String schoolName,
        @Pattern(regexp = Classroom.AVATARS, message = "unknown avatar") String avatar) {
}
