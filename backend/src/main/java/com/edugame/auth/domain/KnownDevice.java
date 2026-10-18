package com.edugame.auth.domain;

import java.io.Serializable;
import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** A browser a user signed in with, by name ("Chrome trên Windows"). Table {@code user_known_device}. */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "user_known_device")
@IdClass(KnownDevice.Key.class)
public class KnownDevice {

    @Id
    @Column(name = "user_id", nullable = false, updatable = false)
    private Long userId;

    @Id
    @Column(name = "device", nullable = false, updatable = false, length = 100)
    private String device;

    @Column(name = "first_seen_at", nullable = false, insertable = false, updatable = false)
    private Instant firstSeenAt;

    @Column(name = "last_seen_at", nullable = false, insertable = false, updatable = false)
    private Instant lastSeenAt;

    /** Primary key: user and device name. */
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class Key implements Serializable {
        private Long userId;
        private String device;
    }
}
