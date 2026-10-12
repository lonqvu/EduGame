package com.edugame.auth.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import javax.crypto.spec.SecretKeySpec;

import com.edugame.common.config.AppProperties;
import com.edugame.user.domain.UserStatus;
import com.edugame.user.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import jakarta.persistence.EntityManager;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

/**
 * What the API accepts as an access token, and what a sign-in session and an account must be for it to keep
 * working. Forged, expired or orphaned tokens must all get 401 {@code INVALID_TOKEN}, never data or a 500.
 * Against the seeded teacher Cô Lan (colan / 123456); rolled back.
 */
@SpringBootTest(properties = "app.auth.default-user-code=")
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@Transactional
class AccessTokenApiTest {

    private static final String COOKIE = "edugame_refresh";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtEncoder jwtEncoder;

    @Autowired
    private AppProperties appProperties;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private UserRepository userRepository;

    /** Sessions are written by JPA: flushed before the SQL of a test reads or changes them. */
    @Autowired
    private EntityManager entityManager;

    // --- Forged and stale tokens ---------------------------------------------------------------------------

    @Test
    void expiredTokenIsRejectedEvenWithALiveSession() throws Exception {
        String sid = payload(accessToken(login(false))).path("sid").asText();
        Instant past = Instant.now().minusSeconds(3600);
        String expired = sign(jwtEncoder, claims(sid).issuedAt(past.minusSeconds(900)).expiresAt(past).build());

        me(expired).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("INVALID_TOKEN"));
    }

    @Test
    void tokenSignedWithAnotherKeyIsRejected() throws Exception {
        String sid = payload(accessToken(login(false))).path("sid").asText();
        JwtEncoder attacker = new NimbusJwtEncoder(new ImmutableSecret<>(new SecretKeySpec(
                "a-completely-different-secret-of-48-bytes-long!!".getBytes(StandardCharsets.UTF_8),
                "HmacSHA256")));

        me(sign(attacker, claims(sid).build())).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_TOKEN"));
    }

    @Test
    void tokenFromAnotherIssuerIsRejected() throws Exception {
        String sid = payload(accessToken(login(false))).path("sid").asText();
        me(sign(jwtEncoder, claims(sid).issuer("someone-else").build())).andExpect(status().isUnauthorized());
    }

    @Test
    void unsignedTokenIsRejected() throws Exception {
        String sid = payload(accessToken(login(false))).path("sid").asText();
        Base64.Encoder b64 = Base64.getUrlEncoder().withoutPadding();
        long now = Instant.now().getEpochSecond();
        String header = b64.encodeToString("{\"alg\":\"none\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
        String payload = b64.encodeToString(("{\"iss\":\"%s\",\"sub\":\"u-lan\",\"roles\":[\"ADMIN\"],\"sid\":\"%s\","
                + "\"iat\":%d,\"exp\":%d}").formatted(appProperties.auth().jwt().issuer(), sid, now, now + 900)
                .getBytes(StandardCharsets.UTF_8));

        me(header + "." + payload + ".").andExpect(status().isUnauthorized());
    }

    @Test
    void validlySignedTokenWithoutALiveSessionIsRejected() throws Exception {
        // No sid at all.
        me(sign(jwtEncoder, claims(null).build())).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_TOKEN"));
        // A sid that is not a UUID, and one that was never a session.
        me(sign(jwtEncoder, claims("not-a-uuid").build())).andExpect(status().isUnauthorized());
        me(sign(jwtEncoder, claims(UUID.randomUUID().toString()).build())).andExpect(status().isUnauthorized());
    }

    @Test
    void tamperedPayloadIsRejected() throws Exception {
        String token = accessToken(login(false));
        String[] parts = token.split("\\.");
        String promoted = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8)
                .replace("\"TEACHER\"", "\"ADMIN\"");
        String forged = parts[0] + "." + Base64.getUrlEncoder().withoutPadding()
                .encodeToString(promoted.getBytes(StandardCharsets.UTF_8)) + "." + parts[2];

        me(forged).andExpect(status().isUnauthorized());
        me(token).andExpect(status().isOk());
    }

    @Test
    void malformedAuthorizationHeadersAreRejected() throws Exception {
        for (String value : List.of("Bearer", "Bearer ", "Basic Y29sYW46MTIzNDU2", "Bearer a.b", "Bearer ...")) {
            mockMvc.perform(get("/api/v1/me").header(HttpHeaders.AUTHORIZATION, value))
                    .andExpect(status().isUnauthorized());
        }
    }

    // --- Sessions -------------------------------------------------------------------------------------------

    @Test
    void tokenStopsWorkingWhenItsSessionExpires() throws Exception {
        MockHttpServletResponse signedIn = login(false);
        String token = accessToken(signedIn);
        me(token).andExpect(status().isOk());

        entityManager.flush();
        jdbc.update("UPDATE user_session SET expires_at = clock_timestamp() - interval '1 second' "
                        + "WHERE sid = ?::uuid",
                payload(token).path("sid").asText());
        // Each real request starts with an empty persistence context; this test shares one.
        entityManager.clear();

        me(token).andExpect(status().isUnauthorized());
        // The refresh token of an expired session is refused too, and the cookie is cleared.
        mockMvc.perform(post("/api/v1/auth/refresh").cookie(new Cookie(COOKIE, refreshCookie(signedIn))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_REFRESH_TOKEN"))
                .andExpect(result -> assertThat(result.getResponse().getHeader(HttpHeaders.SET_COOKIE))
                        .contains("Max-Age=0"));
    }

    @Test
    void signingOutOneDeviceLeavesTheOthersSignedIn() throws Exception {
        MockHttpServletResponse laptop = login(false);
        MockHttpServletResponse phone = login(true);
        assertThat(payload(accessToken(laptop)).path("sid").asText())
                .isNotEqualTo(payload(accessToken(phone)).path("sid").asText());

        mockMvc.perform(post("/api/v1/auth/logout").cookie(new Cookie(COOKIE, refreshCookie(laptop))))
                .andExpect(status().isNoContent());

        me(accessToken(laptop)).andExpect(status().isUnauthorized());
        me(accessToken(phone)).andExpect(status().isOk());
    }

    @Test
    void refreshKeepsTheRememberChoice() throws Exception {
        String remembered = refreshCookie(login(true));
        String browserOnly = refreshCookie(login(false));

        assertThat(refresh(remembered).getHeader(HttpHeaders.SET_COOKIE)).contains("Max-Age=2592000");
        assertThat(refresh(browserOnly).getHeader(HttpHeaders.SET_COOKIE)).doesNotContain("Max-Age");
    }

    @Test
    void sessionLifetimeFollowsTheRememberChoice() throws Exception {
        String shortSid = payload(accessToken(login(false))).path("sid").asText();
        String longSid = payload(accessToken(login(true))).path("sid").asText();

        double shortHours = hoursLeft(shortSid);
        double longDays = hoursLeft(longSid) / 24;
        assertThat(shortHours).isBetween(11.9, 12.0);
        assertThat(longDays).isBetween(29.9, 30.0);
    }

    // --- Accounts -------------------------------------------------------------------------------------------

    @Test
    void lockedOrDeletedTeachersCannotSignInAndLookLikeAWrongPassword() throws Exception {
        String token = accessToken(login(false));
        var lan = userRepository.findByCode("u-lan").orElseThrow();

        for (UserStatus status : List.of(UserStatus.LOCKED, UserStatus.DELETED)) {
            lan.setStatus(status);
            userRepository.flush();
            loginAttempt("colan", "123456").andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
        }
        lan.setStatus(UserStatus.ACTIVE);
        userRepository.flush();
        loginAttempt("colan", "123456").andExpect(status().isOk());
        me(token).andExpect(status().isOk());
    }

    @Test
    void answersNeverCarryPasswordHashesOrRefreshTokens() throws Exception {
        MockHttpServletResponse signedIn = login(false);
        JsonNode body = objectMapper.readTree(signedIn.getContentAsString());
        assertThat(body.fieldNames()).toIterable().containsExactlyInAnyOrder("accessToken", "tokenType", "expiresIn");

        String me = me(accessToken(signedIn)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(me).doesNotContainIgnoringCase("password").doesNotContain(refreshCookie(signedIn));
        assertThat(payload(accessToken(signedIn)).toString()).doesNotContainIgnoringCase("password");
    }

    // --- Odd input ------------------------------------------------------------------------------------------

    @Test
    void oddSignInInputIsHandledWithoutErrors() throws Exception {
        // Very long browser name: stored cut to 255, sign-in works.
        mockMvc.perform(post("/api/v1/auth/login").header(HttpHeaders.USER_AGENT, "x".repeat(2000))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("username", "colan", "password", "123456"))))
                .andExpect(status().isOk());
        entityManager.flush();
        assertThat(jdbc.queryForObject("SELECT max(length(user_agent)) FROM user_session", Integer.class))
                .isEqualTo(255);

        loginAttempt("x".repeat(256), "123456").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        loginAttempt("' OR '1'='1", "' OR '1'='1").andExpect(status().isUnauthorized());
        loginAttempt("colan", "123456\u0000").andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content("{not json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("MALFORMED_REQUEST"));
        mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\": \"colan\"}"))
                .andExpect(status().isBadRequest());
    }

    // --- Helpers --------------------------------------------------------------------------------------------

    private JwtClaimsSet.Builder claims(String sid) {
        Instant now = Instant.now();
        JwtClaimsSet.Builder builder = JwtClaimsSet.builder()
                .issuer(appProperties.auth().jwt().issuer())
                .subject("u-lan")
                .issuedAt(now)
                .expiresAt(now.plusSeconds(900))
                .claim("roles", List.of("TEACHER"));
        return sid == null ? builder : builder.claim("sid", sid);
    }

    private static String sign(JwtEncoder encoder, JwtClaimsSet claims) {
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();
    }

    private JsonNode payload(String accessToken) throws Exception {
        return objectMapper.readTree(Base64.getUrlDecoder().decode(accessToken.split("\\.")[1]));
    }

    private double hoursLeft(String sid) {
        entityManager.flush();
        return jdbc.queryForObject(
                "SELECT extract(epoch FROM expires_at - clock_timestamp()) / 3600 FROM user_session WHERE sid = ?::uuid",
                Double.class, sid);
    }

    private MockHttpServletResponse login(boolean remember) throws Exception {
        return mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("username", "colan", "password", "123456", "remember", remember))))
                .andExpect(status().isOk())
                .andReturn().getResponse();
    }

    private ResultActions loginAttempt(String username, String password) throws Exception {
        return mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("username", username, "password", password))));
    }

    private MockHttpServletResponse refresh(String cookie) throws Exception {
        return mockMvc.perform(post("/api/v1/auth/refresh").cookie(new Cookie(COOKIE, cookie)))
                .andExpect(status().isOk())
                .andReturn().getResponse();
    }

    private ResultActions me(String accessToken) throws Exception {
        return mockMvc.perform(get("/api/v1/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken));
    }

    private String accessToken(MockHttpServletResponse response) throws Exception {
        return objectMapper.readTree(response.getContentAsString()).path("accessToken").asText();
    }

    private static String refreshCookie(MockHttpServletResponse response) {
        Cookie cookie = response.getCookie(COOKIE);
        assertThat(cookie).as("refresh cookie").isNotNull();
        return cookie.getValue();
    }
}
