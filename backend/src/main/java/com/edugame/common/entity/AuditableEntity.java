package com.edugame.common.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import org.hibernate.annotations.UpdateTimestamp;

/**
 * Adds the modification timestamp for tables with {@code updated_at}
 * ({@code users}, {@code game_template}, {@code game}, {@code classroom}, {@code game_session}).
 * Matching column: {@code updated_at TIMESTAMPTZ NOT NULL DEFAULT now()}.
 * <p>
 * The DB trigger {@code set_updated_at} also sets this column, so updates made outside JPA stay correct.
 */
@Getter
@MappedSuperclass
public abstract class AuditableEntity extends CreatedEntity {

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
