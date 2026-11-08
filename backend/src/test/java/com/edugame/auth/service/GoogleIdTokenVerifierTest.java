package com.edugame.auth.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;

/** The claim checks of a Google ID token (the signature is Nimbus' job, with Google's published keys). */
class GoogleIdTokenVerifierTest {

    private static final String CLIENT_ID = "123-abc.apps.googleusercontent.com";

    private final OAuth2TokenValidator<Jwt> validator = GoogleIdTokenVerifier.validator(CLIENT_ID);

    @Test
    void acceptsATokenOfGoogleForThisApp() {
        assertThat(validator.validate(token("https://accounts.google.com", CLIENT_ID, 300)).hasErrors()).isFalse();
        assertThat(validator.validate(token("accounts.google.com", CLIENT_ID, 300)).hasErrors()).isFalse();
    }

    @Test
    void refusesAnotherIssuer() {
        assertThat(validator.validate(token("https://evil.example", CLIENT_ID, 300)).hasErrors()).isTrue();
    }

    @Test
    void refusesATokenForAnotherApp() {
        assertThat(validator.validate(token("https://accounts.google.com", "other.apps.googleusercontent.com", 300))
                .hasErrors()).isTrue();
    }

    @Test
    void refusesAnExpiredToken() {
        assertThat(validator.validate(token("https://accounts.google.com", CLIENT_ID, -600)).hasErrors()).isTrue();
    }

    private static Jwt token(String issuer, String audience, long expiresInSeconds) {
        Instant now = Instant.now();
        return Jwt.withTokenValue("t")
                .header("alg", "RS256")
                .claim("iss", issuer)
                .audience(List.of(audience))
                .subject("1098765")
                .issuedAt(now.minusSeconds(60).plusSeconds(Math.min(0, expiresInSeconds)))
                .expiresAt(now.plusSeconds(expiresInSeconds))
                .build();
    }
}
