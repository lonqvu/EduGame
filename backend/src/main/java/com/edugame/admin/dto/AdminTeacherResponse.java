package com.edugame.admin.dto;

import java.time.Instant;
import java.util.List;

import com.edugame.user.domain.UserRole;
import com.edugame.user.domain.UserStatus;

/**
 * One account for the admin: who it is, what the teacher has made, where they sign in, and what admins did to it.
 *
 * @param loginBlockedUntil sign-ins are refused until then after too many wrong passwords; none: not blocked
 * @param openSessions      signed in on that many browsers now
 * @param self              the admin's own account: it cannot be locked, signed out or demoted from here
 * @param history           the latest admin actions on this account, newest first
 */
public record AdminTeacherResponse(
        String code,
        String displayName,
        String username,
        String email,
        String phone,
        UserRole role,
        UserStatus status,
        boolean emailVerified,
        Instant createdAt,
        Instant lastActiveAt,
        Figures figures,
        long openSessions,
        Instant loginBlockedUntil,
        List<Device> devices,
        boolean self,
        List<AdminAuditLogResponse> history) {

    /**
     * @param students    students in the teacher's classes (counted, never named)
     * @param recentPlays games played in the last 30 days
     */
    public record Figures(long classrooms, long students, long games, long questionSets, long plays,
                          long recentPlays) {
    }

    /** "Chrome trên Windows", first and last used. */
    public record Device(String name, Instant firstSeenAt, Instant lastSeenAt) {
    }
}
