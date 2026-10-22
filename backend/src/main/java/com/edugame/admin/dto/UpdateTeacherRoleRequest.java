package com.edugame.admin.dto;

import com.edugame.user.domain.UserRole;
import jakarta.validation.constraints.NotNull;

public record UpdateTeacherRoleRequest(@NotNull UserRole role) {
}
