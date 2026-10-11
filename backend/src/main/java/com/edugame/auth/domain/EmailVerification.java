package com.edugame.auth.domain;

import java.time.Instant;

import com.edugame.common.entity.CreatedEntity;
import com.fasterxml.jackson.databind.JsonNode;
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
 * One code mailed to an address. Table {@code email_verification}.
 * <p>
 * Only the newest code of an address and purpose counts; older ones are ignored.
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "email_verification")
public class EmailVerification extends CreatedEntity {

    /** Lower-case. */
    @Column(name = "email", nullable = false, length = 255, updatable = false)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(name = "purpose", nullable = false, length = 20, updatable = false)
    private VerificationPurpose purpose;

    /** SHA-256 hex of the 6 digits. */
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "code_hash", nullable = false, length = 64, updatable = false)
    private String codeHash;

    /**
     * REGISTER: {@code {displayName, passwordHash}} of the account to create. {@code null} when the address already
     * had an account: that mail only said so, and no code can complete it.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload", updatable = false)
    private JsonNode payload;

    @Column(name = "attempts", nullable = false)
    private int attempts;

    @Column(name = "expires_at", nullable = false, updatable = false)
    private Instant expiresAt;

    @Column(name = "consumed_at")
    private Instant consumedAt;

    public static EmailVerification issue(String email, VerificationPurpose purpose, String codeHash,
                                          JsonNode payload, Instant expiresAt) {
        EmailVerification verification = new EmailVerification();
        verification.email = email;
        verification.purpose = purpose;
        verification.codeHash = codeHash;
        verification.payload = payload;
        verification.expiresAt = expiresAt;
        return verification;
    }

    /** Can still be completed with the right code. */
    public boolean isUsable(Instant now, int maxAttempts) {
        return payload != null && consumedAt == null && attempts < maxAttempts && expiresAt.isAfter(now);
    }

    public void recordWrongGuess() {
        attempts++;
    }

    public void consume(Instant now) {
        consumedAt = now;
    }
}
