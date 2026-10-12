package com.edugame.auth.dto;

import static com.edugame.auth.dto.LoginRequest.PASSWORD_MAX_BYTES;

import com.edugame.common.validation.MaxUtf8Bytes;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * @param displayName how pupils and the app address the teacher, e.g. "Cô Lan"
 * @param password    at least 8 characters, at most 72 bytes in UTF-8 (the BCrypt limit)
 */
public record RegisterRequest(
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Size(max = 100) String displayName,
        @NotBlank @Size(min = 8, max = 72) @MaxUtf8Bytes(PASSWORD_MAX_BYTES) String password) {

    /** Spaces pasted around the address are not an error. */
    public RegisterRequest {
        email = email == null ? null : email.strip();
    }

    /** Keeps the password out of logs. */
    @Override
    public String toString() {
        return "RegisterRequest[email=%s, displayName=%s]".formatted(email, displayName);
    }
}
