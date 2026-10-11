package com.edugame.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * @param username username or email
 * @param remember "Ghi nhớ đăng nhập": keep the session after the browser closes (omitted = false)
 */
public record LoginRequest(
        @NotBlank @Size(max = 255) String username,
        @NotBlank @Size(max = 100) String password,
        Boolean remember) {

    public boolean rememberMe() {
        return Boolean.TRUE.equals(remember);
    }

    /** Keeps the password out of logs. */
    @Override
    public String toString() {
        return "LoginRequest[username=%s, remember=%s]".formatted(username, remember);
    }
}
