package com.edugame.common.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import org.hibernate.annotations.CreationTimestamp;

/**
 * Adds the creation timestamp for tables that are written once or have no {@code updated_at}
 * (e.g. {@code game_version}, {@code game_item}, {@code player}, {@code session_event}).
 * Matching column: {@code created_at TIMESTAMPTZ NOT NULL DEFAULT now()}.
 */
@Getter
@MappedSuperclass
public abstract class CreatedEntity extends BaseEntity {

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
