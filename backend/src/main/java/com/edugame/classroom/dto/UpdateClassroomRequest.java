package com.edugame.classroom.dto;

import com.edugame.classroom.domain.Classroom;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Partial update: a {@code null} field is left unchanged; an empty school year / school name clears it.
 *
 * @param status ACTIVE or PAUSED (a class is archived with DELETE)
 */
public record UpdateClassroomRequest(
        @Size(max = 50) @Pattern(regexp = "(?s).*\\S.*", message = "must not be blank") String name,
        @Min(1) @Max(12) Short grade,
        @Pattern(regexp = "|" + ClassroomRules.SCHOOL_YEAR, message = "must look like 2026-2027") String schoolYear,
        @Size(max = 100) String schoolName,
        @Pattern(regexp = Classroom.AVATARS, message = "unknown avatar") String avatar,
        @Pattern(regexp = "ACTIVE|PAUSED", message = "must be ACTIVE or PAUSED") String status) {
}
