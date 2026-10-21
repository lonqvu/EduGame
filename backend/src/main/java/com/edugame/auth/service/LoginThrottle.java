package com.edugame.auth.service;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;

import com.edugame.common.config.AppProperties;
import com.edugame.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Limits password guessing ({@code app.auth.login}): too many failed sign-ins for one username / email, or from
 * one client address, within a window lock it for a while (429 {@code TOO_MANY_LOGIN_ATTEMPTS}).
 * <p>
 * Kept in PostgreSQL ({@code login_throttle}), so a restart or a second backend instance does not reset it. Each
 * failure is one atomic upsert, so concurrent guesses are all counted. Unknown usernames are counted like real
 * ones: a lock does not reveal which accounts exist.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class LoginThrottle {

    private static final String UPSERT_FAILURE = """
            INSERT INTO login_throttle (throttle_key, failures, window_started_at, locked_until)
            VALUES (:key, 1, :now, CASE WHEN 1 >= :max THEN CAST(:lockUntil AS timestamptz) END)
            ON CONFLICT (throttle_key) DO UPDATE SET
                failures = CASE WHEN login_throttle.window_started_at < :windowStart THEN 1
                                ELSE login_throttle.failures + 1 END,
                window_started_at = CASE WHEN login_throttle.window_started_at < :windowStart THEN :now
                                         ELSE login_throttle.window_started_at END,
                locked_until = CASE WHEN (CASE WHEN login_throttle.window_started_at < :windowStart THEN 1
                                               ELSE login_throttle.failures + 1 END) >= :max
                                    THEN CAST(:lockUntil AS timestamptz)
                                    ELSE login_throttle.locked_until END
            """;

    private final NamedParameterJdbcTemplate jdbc;
    private final AppProperties appProperties;

    /** Refuses the attempt while the username or the client address is locked. */
    @Transactional(readOnly = true)
    public void check(String username, String clientIp) {
        Instant now = Instant.now();
        Timestamp lockedUntil = jdbc.queryForObject("""
                SELECT max(locked_until) FROM login_throttle
                WHERE throttle_key IN (:keys) AND locked_until > :now
                """, new MapSqlParameterSource("keys", keys(username, clientIp)).addValue("now", Timestamp.from(now)),
                Timestamp.class);
        if (lockedUntil != null) {
            long minutes = Math.max(1, (Duration.between(now, lockedUntil.toInstant()).toSeconds() + 59) / 60);
            throw new BusinessException(HttpStatus.TOO_MANY_REQUESTS, "TOO_MANY_LOGIN_ATTEMPTS",
                    "Too many failed sign-ins, try again in %d min".formatted(minutes));
        }
    }

    /** Counts a failed sign-in against the username and the client address. */
    @Transactional
    public void recordFailure(String username, String clientIp) {
        AppProperties.Login limits = properties();
        Instant now = Instant.now();
        upsertFailure(userKey(username), limits.maxFailures(), now);
        if (clientIp != null) {
            upsertFailure(ipKey(clientIp), limits.maxFailuresPerIp(), now);
        }
    }

    /** Until when sign-ins with any of these names (a user's username and email) are refused, if they are now. */
    @Transactional(readOnly = true)
    public Optional<Instant> lockedUntil(String... usernames) {
        List<String> keys = Arrays.stream(usernames).filter(Objects::nonNull).map(LoginThrottle::userKey).toList();
        if (keys.isEmpty()) {
            return Optional.empty();
        }
        Timestamp until = jdbc.queryForObject("""
                SELECT max(locked_until) FROM login_throttle WHERE throttle_key IN (:keys) AND locked_until > :now
                """, new MapSqlParameterSource("keys", keys).addValue("now", Timestamp.from(Instant.now())),
                Timestamp.class);
        return Optional.ofNullable(until).map(Timestamp::toInstant);
    }

    /** Forgets the failures of a username (signed in, or password reset); the address keeps its count. */
    @Transactional
    public void clear(String... usernames) {
        for (String username : usernames) {
            if (username != null) {
                jdbc.update("DELETE FROM login_throttle WHERE throttle_key = :key",
                        new MapSqlParameterSource("key", userKey(username)));
            }
        }
    }

    @Scheduled(cron = "0 50 3 * * *", zone = "${app.time-zone}")
    @Transactional
    public void deleteOldRows() {
        Instant now = Instant.now();
        int deleted = jdbc.update("""
                DELETE FROM login_throttle
                WHERE window_started_at < :windowStart AND (locked_until IS NULL OR locked_until < :now)
                """, new MapSqlParameterSource("windowStart", Timestamp.from(now.minus(properties().window())))
                .addValue("now", Timestamp.from(now)));
        if (deleted > 0) {
            log.info("Deleted {} old sign-in failure counters", deleted);
        }
    }

    private void upsertFailure(String key, int max, Instant now) {
        jdbc.update(UPSERT_FAILURE, new MapSqlParameterSource("key", key)
                .addValue("max", max)
                .addValue("now", Timestamp.from(now))
                .addValue("windowStart", Timestamp.from(now.minus(properties().window())))
                .addValue("lockUntil", Timestamp.from(now.plus(properties().lockFor()))));
    }

    private static List<String> keys(String username, String clientIp) {
        return clientIp == null ? List.of(userKey(username)) : List.of(userKey(username), ipKey(clientIp));
    }

    private static String userKey(String username) {
        String normalized = username.strip().toLowerCase(Locale.ROOT);
        return "user:" + (normalized.length() > 290 ? normalized.substring(0, 290) : normalized);
    }

    private static String ipKey(String clientIp) {
        return "ip:" + clientIp;
    }

    private AppProperties.Login properties() {
        return appProperties.auth().login();
    }
}
