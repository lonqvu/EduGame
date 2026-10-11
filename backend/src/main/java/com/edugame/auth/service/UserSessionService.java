package com.edugame.auth.service;

import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;

import com.edugame.auth.domain.SessionRevokeReason;
import com.edugame.auth.domain.UserSession;
import com.edugame.auth.repository.UserSessionRepository;
import com.edugame.common.config.AppProperties;
import com.edugame.user.dto.UserAccount;
import com.edugame.user.service.UserAccountService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Sign-in sessions and their refresh tokens.
 * <p>
 * A refresh token is {@code <sid>.<random secret>}; only its SHA-256 is stored. Each refresh rotates it. The token
 * just replaced is still accepted for {@code app.auth.refresh.reuse-grace} (two tabs refreshing at once: the
 * second one gets a new access token, the browser already has the new cookie). Any other already-replaced token
 * means someone else has a copy: the whole session is revoked, the thief and the owner both sign in again.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserSessionService {

    private static final int SECRET_BYTES = 32;
    /** Ended sessions are kept this long for the record, then deleted. */
    private static final Duration KEEP_ENDED = Duration.ofDays(7);

    private final UserSessionRepository sessionRepository;
    private final UserAccountService userAccountService;
    private final AppProperties appProperties;

    /** A new session and the refresh token to put in the cookie. */
    public record OpenedSession(UUID sid, String refreshToken) {
    }

    /**
     * @param refreshToken new token for the cookie; {@code null} when the request came within the reuse grace and
     *                     the cookie must stay as it is
     */
    public record RefreshedSession(UserAccount account, UUID sid, boolean remember, String refreshToken) {
    }

    @Transactional
    public OpenedSession open(UserAccount account, boolean remember, String userAgent) {
        Instant now = Instant.now();
        UUID sid = UUID.randomUUID();
        String token = newToken(sid);
        sessionRepository.save(UserSession.open(sid, account.id(), hash(token), remember, truncate(userAgent), now,
                now.plus(ttl(remember))));
        return new OpenedSession(sid, token);
    }

    /**
     * Exchanges a refresh token for a new one. Empty when the token is unknown, expired, revoked, reused or its
     * user can no longer sign in; revocations decided here are committed even then.
     */
    @Transactional
    public Optional<RefreshedSession> refresh(String refreshToken) {
        Optional<UUID> sid = parseSid(refreshToken);
        if (sid.isEmpty()) {
            return Optional.empty();
        }
        UserSession session = sessionRepository.findBySidForUpdate(sid.get()).orElse(null);
        Instant now = Instant.now();
        if (session == null || !session.isActive(now)) {
            return Optional.empty();
        }

        String presented = hash(refreshToken);
        boolean current = matches(presented, session.getTokenHash());
        boolean justReplaced = !current && matches(presented, session.getPreviousTokenHash())
                && session.getRotatedAt().plus(refreshProperties().reuseGrace()).isAfter(now);
        if (!current && !justReplaced) {
            session.revoke(SessionRevokeReason.TOKEN_REUSE, now);
            log.warn("Refresh token reused, session {} of user {} revoked", session.getSid(), session.getUserId());
            return Optional.empty();
        }

        Optional<UserAccount> account = userAccountService.findActiveById(session.getUserId());
        if (account.isEmpty()) {
            session.revoke(SessionRevokeReason.USER_INACTIVE, now);
            return Optional.empty();
        }

        String newToken = null;
        if (current) {
            newToken = newToken(session.getSid());
            session.rotate(hash(newToken), now, now.plus(ttl(session.isRemember())));
        }
        return Optional.of(new RefreshedSession(account.get(), session.getSid(), session.isRemember(), newToken));
    }

    /** Signs out the session of this refresh token (current or just replaced); anything else is ignored. */
    @Transactional
    public void revoke(String refreshToken) {
        parseSid(refreshToken).flatMap(sessionRepository::findBySidForUpdate).ifPresent(session -> {
            String presented = hash(refreshToken);
            if (matches(presented, session.getTokenHash()) || matches(presented, session.getPreviousTokenHash())) {
                session.revoke(SessionRevokeReason.LOGOUT, Instant.now());
            }
        });
    }

    /** Ends every open session of a user (password reset): their access tokens stop working at once. */
    @Transactional
    public int revokeAllOfUser(Long userId, SessionRevokeReason reason) {
        return sessionRepository.revokeAllOfUser(userId, reason, Instant.now());
    }

    /** Whether access tokens of this session are still honored. */
    @Transactional(readOnly = true)
    public boolean isActive(UUID sid) {
        return sessionRepository.isActive(sid, Instant.now());
    }

    @Scheduled(cron = "0 30 3 * * *", zone = "${app.time-zone}")
    @Transactional
    public void deleteEndedSessions() {
        int deleted = sessionRepository.deleteEndedBefore(Instant.now().minus(KEEP_ENDED));
        if (deleted > 0) {
            log.info("Deleted {} ended sign-in sessions", deleted);
        }
    }

    private Duration ttl(boolean remember) {
        return remember ? refreshProperties().rememberTtl() : refreshProperties().sessionTtl();
    }

    private AppProperties.Refresh refreshProperties() {
        return appProperties.auth().refresh();
    }

    private static String newToken(UUID sid) {
        byte[] secret = new byte[SECRET_BYTES];
        Secrets.RANDOM.nextBytes(secret);
        return sid + "." + Base64.getUrlEncoder().withoutPadding().encodeToString(secret);
    }

    private static Optional<UUID> parseSid(String token) {
        if (token == null) {
            return Optional.empty();
        }
        int dot = token.indexOf('.');
        if (dot <= 0) {
            return Optional.empty();
        }
        try {
            return Optional.of(UUID.fromString(token.substring(0, dot)));
        } catch (IllegalArgumentException ex) {
            return Optional.empty();
        }
    }

    private static String hash(String token) {
        return Secrets.sha256Hex(token);
    }

    private static boolean matches(String presentedHash, String storedHash) {
        return Secrets.matches(presentedHash, storedHash);
    }

    private static String truncate(String userAgent) {
        return userAgent == null || userAgent.length() <= 255 ? userAgent : userAgent.substring(0, 255);
    }
}
