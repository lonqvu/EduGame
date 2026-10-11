package com.edugame.auth.dto;

/**
 * Answer to sign-up and resend. The same whether or not the address already has an account.
 *
 * @param email       the address the mail went to, normalized (lower-case)
 * @param expiresIn   seconds the code works
 * @param resendAfter seconds before another code can be asked for
 */
public record CodeSentResponse(String email, long expiresIn, long resendAfter) {
}
