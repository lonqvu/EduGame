package com.edugame.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * @param code     the 6 digits from the mail
 * @param remember keep the session after the browser closes (omitted = true: a new account on its own device)
 */
public record VerifyEmailRequest(
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Pattern(regexp = "\\d{6}") String code,
        Boolean remember) {

    public VerifyEmailRequest {
        email = email == null ? null : email.strip();
        code = code == null ? null : code.strip();
    }

    public boolean rememberMe() {
        return !Boolean.FALSE.equals(remember);
    }
}
