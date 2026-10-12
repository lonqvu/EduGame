package com.edugame.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.util.List;

import com.edugame.common.config.AppProperties;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.JwtException;

/** The backend refuses to start with a missing or weak signing key, rather than issue forgeable tokens. */
class JwtConfigTest {

    @Test
    void refusesMissingOrShortSecrets() {
        for (String secret : new String[] {null, "", "too-short", "x".repeat(31)}) {
            assertThatThrownBy(() -> new JwtConfig(properties(secret)))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("JWT_SECRET");
        }
    }

    @Test
    void acceptsAThirtyTwoByteSecretAndRoundTripsTokens() {
        JwtConfig config = new JwtConfig(properties("x".repeat(32)));
        assertThatCode(config::jwtEncoder).doesNotThrowAnyException();

        var decoder = config.jwtDecoder(List.of());
        assertThatThrownBy(() -> decoder.decode("not.a.token")).isInstanceOf(JwtException.class);
        assertThat(decoder).isNotNull();
    }

    private static AppProperties properties(String secret) {
        return new AppProperties(null, new AppProperties.Auth(null,
                new AppProperties.Jwt(secret, "edu-game", Duration.ofMinutes(15)), null, null, null), null, null);
    }
}
