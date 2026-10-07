package com.edugame.common.entity;

import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import org.hibernate.proxy.HibernateProxy;

/**
 * Identity column shared by all entities.
 * Matching column: {@code id BIGSERIAL PRIMARY KEY}.
 * <p>
 * Extend directly only for tables without {@code created_at} (e.g. {@code game_category}, {@code player_award}).
 * Otherwise use {@link CreatedEntity} or {@link AuditableEntity}.
 * <p>
 * Equality is based on {@code id}: two transient (unsaved) instances are never equal. The hash code is constant
 * per entity class so it does not change when the entity is persisted. Hibernate proxies are unwrapped, and
 * {@link #getId()} is used instead of the field because a proxy's own fields are not initialized.
 */
@Getter
@MappedSuperclass
public abstract class BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Override
    public final boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof BaseEntity other) || effectiveClass(this) != effectiveClass(o)) {
            return false;
        }
        Long id = getId();
        return id != null && id.equals(other.getId());
    }

    @Override
    public final int hashCode() {
        return effectiveClass(this).hashCode();
    }

    private static Class<?> effectiveClass(Object o) {
        return o instanceof HibernateProxy proxy
                ? proxy.getHibernateLazyInitializer().getPersistentClass()
                : o.getClass();
    }
}
