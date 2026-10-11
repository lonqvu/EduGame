package com.edugame.auth.service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.edugame.auth.dto.TokenResponse;
import com.edugame.common.config.AppProperties;
import com.edugame.security.SecurityConfig;
import com.edugame.user.dto.UserAccount;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

/**
 * Issues access tokens: a signed JWT with {@code sub} = user code, {@code roles} and {@code sid}, the sign-in
 * session ({@link SessionTokenValidator} rejects the token once that session has ended). Nothing else is stored;
 * otherwise the token is valid until it expires.
 */
@Service
@RequiredArgsConstructor
public class AccessTokenService {

    /** Access token claim with the {@code user_session.sid} it belongs to. */
    public static final String SESSION_CLAIM = "sid";

    private final JwtEncoder jwtEncoder;
    private final AppProperties appProperties;

    public TokenResponse issue(UserAccount account, UUID sid) {
        AppProperties.Jwt jwt = appProperties.auth().jwt();
        Duration ttl = jwt.accessTokenTtl();
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(jwt.issuer())
                .subject(account.code())
                .id(UUID.randomUUID().toString())
                .issuedAt(now)
                .expiresAt(now.plus(ttl))
                .claim(SecurityConfig.ROLES_CLAIM, List.of(account.role().name()))
                .claim(SESSION_CLAIM, sid.toString())
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        String token = jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
        return new TokenResponse(token, "Bearer", ttl.toSeconds());
    }
}
