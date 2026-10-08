package com.edugame.user.dto;

import com.edugame.user.domain.UserRole;

public record UserResponse(
        String code,
        String username,
        String displayName,
        String email,
        UserRole role) {
}
