package com.edugame.auth.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import com.edugame.auth.mail.AuthMail;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

/**
 * Password guessing limits and the 72-byte BCrypt limit, against the seeded teacher Cô Lan (colan / 123456) and
 * PostgreSQL. Limits: 5 failures per username, 30 per address, in 15 min (application.yml). Rolled back.
 */
@SpringBootTest(properties = "app.auth.default-user-code=")
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@Transactional
@RecordApplicationEvents
class LoginSecurityApiTest {

    /** 25 letters with diacritics: well under 72 characters, but more than 72 bytes in UTF-8. */
    private static final String LONG_VIETNAMESE = "ệ".repeat(25);

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private ApplicationEvents events;

    @Test
    void fiveWrongPasswordsLockTheUsernameEvenForTheRightPassword() throws Exception {
        for (int i = 0; i < 5; i++) {
            login("colan", "wrong-" + i, "10.0.0.1").andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
        }
        login("colan", "123456", "10.0.0.2").andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("TOO_MANY_LOGIN_ATTEMPTS"))
                .andExpect(jsonPath("$.message").value("Too many failed sign-ins, try again in 15 min"));
        // Typed differently, still the same username.
        login("  COLAN ", "123456", "10.0.0.3").andExpect(status().isTooManyRequests());

        // Once the lock is over, the right password works again.
        jdbc.update("UPDATE login_throttle SET locked_until = now() - interval '1 second', "
                + "window_started_at = now() - interval '1 hour' WHERE throttle_key = 'user:colan'");
        login("colan", "123456", "10.0.0.2").andExpect(status().isOk());
    }

    @Test
    void unknownUsernamesAreLockedTooSoLocksRevealNothing() throws Exception {
        for (int i = 0; i < 5; i++) {
            login("nobody", "x" + i, "10.0.0.1").andExpect(status().isUnauthorized());
        }
        login("nobody", "y", "10.0.0.1").andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("TOO_MANY_LOGIN_ATTEMPTS"));
    }

    @Test
    void successResetsTheCountAndOtherUsersAreNotAffected() throws Exception {
        for (int i = 0; i < 4; i++) {
            login("colan", "wrong", "10.0.0.1").andExpect(status().isUnauthorized());
        }
        login("colan", "123456", "10.0.0.1").andExpect(status().isOk());
        for (int i = 0; i < 4; i++) {
            login("colan", "wrong", "10.0.0.1").andExpect(status().isUnauthorized());
        }
        login("colan", "123456", "10.0.0.1").andExpect(status().isOk());

        for (int i = 0; i < 5; i++) {
            login("someone-else", "wrong", "10.0.0.1").andExpect(status().isUnauthorized());
        }
        login("colan", "123456", "10.0.0.1").andExpect(status().isOk());
    }

    @Test
    void oneAddressTryingManyUsernamesIsLocked() throws Exception {
        for (int i = 0; i < 30; i++) {
            login("guess" + i, "123456", "10.9.9.9").andExpect(status().isUnauthorized());
        }
        login("colan", "123456", "10.9.9.9").andExpect(status().isTooManyRequests());
        // Teachers on other addresses still sign in.
        login("colan", "123456", "10.0.0.1").andExpect(status().isOk());
    }

    @Test
    void passwordResetLiftsTheLock() throws Exception {
        for (int i = 0; i < 5; i++) {
            login("colan", "wrong", "10.0.0.1").andExpect(status().isUnauthorized());
        }
        postJson("/api/v1/auth/password/forgot", Map.of("email", "colan@edugame.local"))
                .andExpect(status().isAccepted());
        postJson("/api/v1/auth/password/reset", Map.of("email", "colan@edugame.local", "code", lastCode(),
                "newPassword", "mat-khau-moi-2026")).andExpect(status().isOk());

        login("colan", "mat-khau-moi-2026", "10.0.0.1").andExpect(status().isOk());
    }

    @Test
    void passwordsOverBcryptsLimitAreRefusedCleanly() throws Exception {
        assertThat(LONG_VIETNAMESE.length()).isLessThan(72);
        assertThat(LONG_VIETNAMESE.getBytes(StandardCharsets.UTF_8).length).isGreaterThan(72);

        postJson("/api/v1/auth/register", Map.of("email", "co.mai@example.com", "displayName", "Cô Mai",
                "password", LONG_VIETNAMESE))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.violations[0].field").value("password"));
        postJson("/api/v1/auth/password/reset", Map.of("email", "colan@edugame.local", "code", "123456",
                "newPassword", "a".repeat(73)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.violations[0].field").value("newPassword"));

        // At sign-in it simply cannot match (it used to be a 500).
        login("colan", LONG_VIETNAMESE, "10.0.0.1").andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));

        // Exactly 72 bytes is fine: 24 letters of 3 bytes.
        postJson("/api/v1/auth/register", Map.of("email", "co.mai@example.com", "displayName", "Cô Mai",
                "password", "ệ".repeat(24)))
                .andExpect(status().isAccepted());
    }

    private String lastCode() {
        List<AuthMail.VerificationCode> codes = events.stream(AuthMail.VerificationCode.class).toList();
        assertThat(codes).as("a code was mailed").isNotEmpty();
        return codes.getLast().code();
    }

    private ResultActions login(String username, String password, String clientIp) throws Exception {
        return mockMvc.perform(post("/api/v1/auth/login")
                .with(request -> {
                    request.setRemoteAddr(clientIp);
                    return request;
                })
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("username", username, "password", password))));
    }

    private ResultActions postJson(String path, Map<String, ?> body) throws Exception {
        return mockMvc.perform(post(path).contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)));
    }
}
