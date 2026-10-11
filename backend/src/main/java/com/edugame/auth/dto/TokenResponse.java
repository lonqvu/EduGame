package com.edugame.auth.dto;

/**
 * An access token, sent back as {@code Authorization: Bearer <accessToken>}.
 *
 * @param tokenType always {@code Bearer}
 * @param expiresIn seconds until the token expires
 */
public record TokenResponse(String accessToken, String tokenType, long expiresIn) {
}
