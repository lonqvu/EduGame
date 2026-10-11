package com.edugame.security;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import com.edugame.common.config.AppProperties;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

/**
 * Signing and verification of access tokens (HS256 with {@code app.auth.jwt.secret}).
 * <p>
 * Every token must carry the configured issuer, be unexpired (60 s clock skew allowed) and pass the
 * {@code OAuth2TokenValidator<Jwt>} beans of other modules (its sign-in session still open).
 */
@Configuration
public class JwtConfig {

    private static final int MIN_SECRET_BYTES = 32;

    private final AppProperties.Jwt jwt;
    private final SecretKey key;

    public JwtConfig(AppProperties appProperties) {
        this.jwt = appProperties.auth() == null ? null : appProperties.auth().jwt();
        String secret = jwt == null ? null : jwt.secret();
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < MIN_SECRET_BYTES) {
            throw new IllegalStateException("app.auth.jwt.secret (env JWT_SECRET) must be at least "
                    + MIN_SECRET_BYTES + " bytes");
        }
        this.key = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    @Bean
    public JwtEncoder jwtEncoder() {
        return new NimbusJwtEncoder(new ImmutableSecret<>(key));
    }

    /**
     * @param extraValidators validator beans of other modules (the sign-in session check of module auth), run
     *                        after the signature, issuer and expiry checks
     */
    @Bean
    public JwtDecoder jwtDecoder(List<OAuth2TokenValidator<Jwt>> extraValidators) {
        List<OAuth2TokenValidator<Jwt>> validators = new ArrayList<>();
        validators.add(JwtValidators.createDefaultWithIssuer(jwt.issuer()));
        validators.addAll(extraValidators);
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(validators));
        return decoder;
    }
}
