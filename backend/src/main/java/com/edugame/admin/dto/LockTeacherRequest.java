package com.edugame.admin.dto;

import jakarta.validation.constraints.Size;

/** @param reason why, kept in the admin log (optional) */
public record LockTeacherRequest(@Size(max = 300) String reason) {

    public LockTeacherRequest {
        reason = reason == null || reason.isBlank() ? null : reason.strip();
    }
}
