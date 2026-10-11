package com.edugame.auth.service;

import java.util.UUID;

import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2ErrorCodes;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

/**
 * Rejects an access token whose sign-in session has ended (signed out, revoked, expired), so signing out takes
 * effect at once instead of when the token expires. Picked up by {@code JwtConfig} like any validator bean; the
 * answer is then 401 {@code INVALID_TOKEN}.
 */
@Component
@RequiredArgsConstructor
public class SessionTokenValidator implements OAuth2TokenValidator<Jwt> {

    private static final OAuth2TokenValidatorResult SESSION_ENDED = OAuth2TokenValidatorResult.failure(
            new OAuth2Error(OAuth2ErrorCodes.INVALID_TOKEN, "The sign-in session has ended", null));

    private final UserSessionService userSessionService;

    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        String sid = jwt.getClaimAsString(AccessTokenService.SESSION_CLAIM);
        if (sid == null) {
            return SESSION_ENDED;
        }
        try {
            return userSessionService.isActive(UUID.fromString(sid)) ? OAuth2TokenValidatorResult.success()
                    : SESSION_ENDED;
        } catch (IllegalArgumentException ex) {
            return SESSION_ENDED;
        }
    }
}
