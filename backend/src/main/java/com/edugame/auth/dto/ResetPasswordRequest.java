package com.edugame.auth.dto;

import static com.edugame.auth.dto.LoginRequest.PASSWORD_MAX_BYTES;

import com.edugame.common.validation.MaxUtf8Bytes;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * @param code        the 6 digits from the mail
 * @param newPassword at least 8 characters, at most 72 bytes in UTF-8 (the BCrypt limit)
 */
public record ResetPasswordRequest(
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Pattern(regexp = "\\d{6}") String code,
        @NotBlank @Size(min = 8, max = 72) @MaxUtf8Bytes(PASSWORD_MAX_BYTES) String newPassword) {

    public ResetPasswordRequest {
        email = email == null ? null : email.strip();
        code = code == null ? null : code.strip();
    }

    /** Keeps the password out of logs. */
    @Override
    public String toString() {
        return "ResetPasswordRequest[email=%s]".formatted(email);
    }
}
