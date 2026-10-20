package com.edugame.user.dto;

import java.time.Instant;

import com.edugame.user.domain.UserRole;

/**
 * "Hồ sơ của tôi": the account and what the teacher has done with Lớp vui.
 *
 * @param phone         digits only; {@code null} when not given
 * @param avatar        one of {@link ProfileRules#AVATARS}, or {@link ProfileRules#UPLOADED}; {@code null}: the default
 * @param avatarUrl     address of the uploaded picture ("/api/v1/avatars/..."); {@code null} with a drawing
 * @param emailVerified the teacher confirmed the email (sign-up or password reset code)
 * @param memberSince   when the account was made
 */
public record ProfileResponse(
        String code,
        String username,
        String displayName,
        String email,
        String phone,
        String avatar,
        String avatarUrl,
        UserRole role,
        boolean emailVerified,
        Instant memberSince,
        Stats stats) {

    /**
     * @param classrooms   classes managed (active and paused)
     * @param students     students in those classes
     * @param questionSets question sets in the bank
     * @param activities   games run with a class
     */
    public record Stats(long classrooms, long students, long questionSets, long activities) {
    }
}
