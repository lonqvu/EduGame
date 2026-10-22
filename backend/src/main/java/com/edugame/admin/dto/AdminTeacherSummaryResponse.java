package com.edugame.admin.dto;

import java.time.Instant;

import com.edugame.user.domain.UserRole;
import com.edugame.user.domain.UserStatus;

/**
 * An account in the admin list.
 *
 * @param lastActiveAt last sign-in or page load; none if the account was never used
 * @param classrooms   classes not archived
 * @param games        games not archived
 */
public record AdminTeacherSummaryResponse(
        String code,
        String displayName,
        String username,
        String email,
        UserRole role,
        UserStatus status,
        boolean emailVerified,
        Instant createdAt,
        Instant lastActiveAt,
        long classrooms,
        long games) {
}
