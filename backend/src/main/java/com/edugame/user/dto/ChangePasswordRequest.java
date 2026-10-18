package com.edugame.user.dto;

import static com.edugame.auth.dto.LoginRequest.PASSWORD_MAX_BYTES;

import com.edugame.common.validation.MaxUtf8Bytes;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * @param currentPassword proves it is the owner at the keyboard
 * @param newPassword     at least 8 characters, at most 72 bytes in UTF-8 (the BCrypt limit), as at sign-up
 */
public record ChangePasswordRequest(
        @NotBlank @Size(max = 72) @MaxUtf8Bytes(PASSWORD_MAX_BYTES) String currentPassword,
        @NotBlank @Size(min = 8, max = 72) @MaxUtf8Bytes(PASSWORD_MAX_BYTES) String newPassword) {

    /** Keeps the passwords out of logs. */
    @Override
    public String toString() {
        return "ChangePasswordRequest[]";
    }
}
