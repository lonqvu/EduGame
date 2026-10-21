package com.edugame.admin.domain;

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

/** One change made by an admin. Table {@code admin_audit_log}; rows are only ever added. */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "admin_audit_log")
public class AdminAuditLog extends CreatedEntity {

    /** Null once the admin's account is deleted; {@link #actorName} stays. */
    @Column(name = "actor_id", updatable = false)
    private Long actorId;

    @Column(name = "actor_name", nullable = false, length = 100, updatable = false)
    private String actorName;

    @Enumerated(EnumType.STRING)
    @Column(name = "action", nullable = false, length = 40, updatable = false)
    private AdminAction action;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 20, updatable = false)
    private AdminTargetType targetType;

    /** {@code users.code} or {@code feedback.code}; none for an export. */
    @Column(name = "target_code", length = 32, updatable = false)
    private String targetCode;

    /** "Cô Lan (colan@truong.edu.vn)", as it was then. */
    @Column(name = "target_label", length = 255, updatable = false)
    private String targetLabel;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "details", nullable = false, updatable = false)
    private JsonNode details;

    public static AdminAuditLog of(Long actorId, String actorName, AdminAction action, AdminTargetType targetType,
                                   String targetCode, String targetLabel, JsonNode details) {
        AdminAuditLog entry = new AdminAuditLog();
        entry.actorId = actorId;
        entry.actorName = actorName;
        entry.action = action;
        entry.targetType = targetType;
        entry.targetCode = targetCode;
        entry.targetLabel = targetLabel == null || targetLabel.length() <= 255 ? targetLabel : targetLabel.substring(0, 255);
        entry.details = details;
        return entry;
    }
}
