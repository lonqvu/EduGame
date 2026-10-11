package com.edugame.auth.domain;

import java.time.Instant;
import java.util.UUID;

import com.edugame.common.entity.CreatedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * One sign-in on one browser. Table {@code user_session}.
 * <p>
 * Holds the SHA-256 of the current refresh token (and of the one it replaced, for {@code reuse-grace}). Access
 * tokens carry {@link #sid}; they stop working as soon as the session is revoked or expires.
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "user_session")
public class UserSession extends CreatedEntity {

    @Column(name = "sid", nullable = false, updatable = false)
    private UUID sid;

    /** {@code users.id}; module user is referenced by id only. */
    @Column(name = "user_id", nullable = false, updatable = false)
    private Long userId;

    /** SHA-256 hex, fixed length: {@code CHAR(64)}. */
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "token_hash", nullable = false, length = 64)
    private String tokenHash;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "previous_token_hash", length = 64)
    private String previousTokenHash;

    @Column(name = "rotated_at")
    private Instant rotatedAt;

    @Column(name = "remember", nullable = false, updatable = false)
    private boolean remember;

    @Column(name = "user_agent", length = 255, updatable = false)
    private String userAgent;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "last_used_at", nullable = false)
    private Instant lastUsedAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "revoke_reason", length = 20)
    private SessionRevokeReason revokeReason;

    public static UserSession open(UUID sid, Long userId, String tokenHash, boolean remember, String userAgent,
                                   Instant now, Instant expiresAt) {
        UserSession session = new UserSession();
        session.sid = sid;
        session.userId = userId;
        session.tokenHash = tokenHash;
        session.remember = remember;
        session.userAgent = userAgent;
        session.lastUsedAt = now;
        session.expiresAt = expiresAt;
        return session;
    }

    public boolean isActive(Instant now) {
        return revokedAt == null && expiresAt.isAfter(now);
    }

    /** Replaces the refresh token; the old one stays acceptable for the reuse grace period. */
    public void rotate(String newTokenHash, Instant now, Instant newExpiresAt) {
        previousTokenHash = tokenHash;
        tokenHash = newTokenHash;
        rotatedAt = now;
        lastUsedAt = now;
        expiresAt = newExpiresAt;
    }

    public void revoke(SessionRevokeReason reason, Instant now) {
        if (revokedAt == null) {
            revokedAt = now;
            revokeReason = reason;
        }
    }
}
