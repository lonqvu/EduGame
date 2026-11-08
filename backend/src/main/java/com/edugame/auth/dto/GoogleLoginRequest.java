package com.edugame.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * @param credential the ID token Google Identity Services gave the browser
 * @param remember   "Ghi nhớ đăng nhập": keep the session after the browser closes (omitted = false)
 */
public record GoogleLoginRequest(@NotBlank @Size(max = 4096) String credential, Boolean remember) {

    public boolean rememberMe() {
        return Boolean.TRUE.equals(remember);
    }

    /** Keeps the token out of logs. */
    @Override
    public String toString() {
        return "GoogleLoginRequest[remember=%s]".formatted(remember);
    }
}
