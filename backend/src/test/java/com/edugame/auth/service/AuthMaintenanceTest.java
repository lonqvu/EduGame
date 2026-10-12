package com.edugame.auth.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

/**
 * The nightly clean-up jobs keep the auth tables small without touching anything still in use, and the failure
 * counters forget old failures. Rows are made with SQL to set their ages; rolled back.
 */
@SpringBootTest(properties = "app.auth.default-user-code=")
@ActiveProfiles("dev")
@Transactional
class AuthMaintenanceTest {

    @Autowired
    private UserSessionService userSessionService;

    @Autowired
    private EmailVerificationService emailVerificationService;

    @Autowired
    private LoginThrottle loginThrottle;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void endedSessionsAreDeletedAfterAWeekLiveOnesStay() {
        UUID live = session("now() + interval '1 day'", null);
        UUID revokedYesterday = session("now() + interval '1 day'", "now() - interval '1 day'");
        UUID revokedLongAgo = session("now() + interval '1 day'", "now() - interval '8 days'");
        UUID expiredLongAgo = session("now() - interval '8 days'", null);

        userSessionService.deleteEndedSessions();

        assertThat(existingSessions(live, revokedYesterday, revokedLongAgo, expiredLongAgo))
                .containsExactlyInAnyOrder(live, revokedYesterday);
    }

    @Test
    void codesAreDeletedADayAfterTheyExpire() {
        long fresh = code("now() + interval '10 minutes'");
        long expiredToday = code("now() - interval '1 hour'");
        long expiredLongAgo = code("now() - interval '2 days'");

        emailVerificationService.deleteExpiredCodes();

        assertThat(jdbc.queryForList("SELECT id FROM email_verification WHERE id IN (?, ?, ?)", Long.class,
                fresh, expiredToday, expiredLongAgo)).containsExactlyInAnyOrder(fresh, expiredToday);
    }

    @Test
    void oldFailureCountersAreDeletedLocksStay() {
        jdbc.update("INSERT INTO login_throttle VALUES ('user:old', 3, now() - interval '1 hour', NULL)");
        jdbc.update("INSERT INTO login_throttle VALUES ('user:recent', 3, now() - interval '1 minute', NULL)");
        jdbc.update("INSERT INTO login_throttle VALUES ('user:locked', 5, now() - interval '1 hour', "
                + "now() + interval '5 minutes')");

        loginThrottle.deleteOldRows();

        assertThat(jdbc.queryForList("SELECT throttle_key FROM login_throttle WHERE throttle_key LIKE 'user:%'",
                String.class)).contains("user:recent", "user:locked").doesNotContain("user:old");
    }

    @Test
    void failuresOutsideTheWindowStartANewCount() {
        for (int i = 0; i < 4; i++) {
            loginThrottle.recordFailure("window-test", null);
        }
        jdbc.update("UPDATE login_throttle SET window_started_at = now() - interval '16 minutes' "
                + "WHERE throttle_key = 'user:window-test'");

        loginThrottle.recordFailure("window-test", null);

        assertThat(jdbc.queryForObject("SELECT failures FROM login_throttle WHERE throttle_key = 'user:window-test'",
                Integer.class)).isEqualTo(1);
        loginThrottle.check("window-test", null);
    }

    private UUID session(String expiresAt, String revokedAt) {
        UUID sid = UUID.randomUUID();
        jdbc.update(("INSERT INTO user_session (sid, user_id, token_hash, expires_at, revoked_at, revoke_reason) "
                        + "VALUES (?, (SELECT id FROM users WHERE code = 'u-lan'), ?, %s, %s, %s)")
                        .formatted(expiresAt, revokedAt == null ? "NULL" : revokedAt,
                                revokedAt == null ? "NULL" : "'LOGOUT'"),
                sid, "0".repeat(64));
        return sid;
    }

    private List<UUID> existingSessions(UUID... sids) {
        return jdbc.queryForList("SELECT sid FROM user_session WHERE sid = ANY (?)", UUID.class,
                (Object) sids);
    }

    private long code(String expiresAt) {
        return jdbc.queryForObject(("INSERT INTO email_verification (email, purpose, code_hash, expires_at) "
                + "VALUES ('clean-up@example.com', 'REGISTER', ?, %s) RETURNING id").formatted(expiresAt),
                Long.class, "0".repeat(64));
    }
}
