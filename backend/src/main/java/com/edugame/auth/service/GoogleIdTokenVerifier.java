package com.edugame.auth.service;

import java.util.List;
import java.util.Locale;
import java.util.Set;

import com.edugame.common.config.AppProperties;
import com.edugame.common.exception.BusinessException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

/**
 * Checks the ID token Google Identity Services hands the browser ("Đăng nhập với Google"): signed by Google (keys
 * from its JWK set, cached by Nimbus), issued by Google, for this app's client id, unexpired, with a verified email.
 * <p>
 * Not a {@code JwtDecoder} bean on purpose: that one checks the app's own access tokens.
 */
@Slf4j
@Component
public class GoogleIdTokenVerifier {

    static final String JWK_SET_URI = "https://www.googleapis.com/oauth2/v3/certs";
    private static final Set<String> ISSUERS = Set.of("https://accounts.google.com", "accounts.google.com");

    /**
     * What the token proves about the Google account.
     *
     * @param sub   stable id of the Google account
     * @param email verified address, lower case
     * @param name  full name; {@code null} when Google gave none
     */
    public record GoogleIdentity(String sub, String email, String name) {
    }

    private final AppProperties.Google google;
    private volatile NimbusJwtDecoder decoder;

    public GoogleIdTokenVerifier(AppProperties appProperties) {
        this.google = appProperties.auth() == null ? null : appProperties.auth().google();
    }

    public boolean enabled() {
        return google != null && google.enabled();
    }

    /**
     * @throws BusinessException 503 {@code GOOGLE_SIGN_IN_DISABLED} (no client id configured), 401
     *                           {@code INVALID_GOOGLE_TOKEN} (forged, expired, for another app, unverified email)
     */
    public GoogleIdentity verify(String idToken) {
        if (!enabled()) {
            throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "GOOGLE_SIGN_IN_DISABLED",
                    "Google sign-in is not configured (app.auth.google.client-id)");
        }
        Jwt jwt;
        try {
            jwt = decoder().decode(idToken);
        } catch (JwtException ex) {
            log.info("Google ID token refused: {}", ex.getMessage());
            throw invalid();
        }
        String email = jwt.getClaimAsString("email");
        if (email == null || email.isBlank() || !Boolean.TRUE.equals(jwt.getClaimAsBoolean("email_verified"))) {
            log.info("Google ID token refused: no verified email");
            throw invalid();
        }
        return new GoogleIdentity(jwt.getSubject(), email.strip().toLowerCase(Locale.ROOT),
                jwt.getClaimAsString("name"));
    }

    private NimbusJwtDecoder decoder() {
        NimbusJwtDecoder current = decoder;
        if (current == null) {
            synchronized (this) {
                current = decoder;
                if (current == null) {
                    current = NimbusJwtDecoder.withJwkSetUri(JWK_SET_URI)
                            .jwsAlgorithm(SignatureAlgorithm.RS256)
                            .build();
                    current.setJwtValidator(validator(google.clientId().strip()));
                    decoder = current;
                }
            }
        }
        return current;
    }

    static OAuth2TokenValidator<Jwt> validator(String clientId) {
        OAuth2TokenValidator<Jwt> issuer = jwt -> ISSUERS.contains(jwt.getClaimAsString(JwtClaimNames.ISS))
                ? OAuth2TokenValidatorResult.success()
                : failure("Not issued by Google");
        OAuth2TokenValidator<Jwt> audience = jwt -> {
            List<String> aud = jwt.getAudience();
            return aud != null && aud.contains(clientId)
                    ? OAuth2TokenValidatorResult.success()
                    : failure("Issued for another app");
        };
        OAuth2TokenValidator<Jwt> subject = jwt -> jwt.getSubject() != null && !jwt.getSubject().isBlank()
                ? OAuth2TokenValidatorResult.success()
                : failure("No subject");
        return new DelegatingOAuth2TokenValidator<>(new JwtTimestampValidator(), issuer, audience, subject);
    }

    private static OAuth2TokenValidatorResult failure(String description) {
        return OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", description, null));
    }

    private static BusinessException invalid() {
        return new BusinessException(HttpStatus.UNAUTHORIZED, "INVALID_GOOGLE_TOKEN",
                "Google sign-in could not be verified");
    }
}
