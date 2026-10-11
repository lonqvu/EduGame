package com.edugame.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * @param code        the 6 digits from the mail
 * @param newPassword at least 8 characters
 */
public record ResetPasswordRequest(
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Pattern(regexp = "\\d{6}") String code,
        @NotBlank @Size(min = 8, max = 100) String newPassword) {

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
