package com.edugame.admin.dto;

import java.time.Instant;

import com.edugame.admin.domain.AdminAction;
import com.edugame.admin.domain.AdminTargetType;
import com.fasterxml.jackson.databind.JsonNode;

/**
 * One line of the admin log.
 *
 * @param targetLabel the teacher or feedback as it was then, e.g. "Cô Lan (colan@truong.edu.vn)"
 * @param details     what changed, e.g. {@code {"from": "NEW", "to": "DONE"}} or {@code {"reason": "…"}}
 */
public record AdminAuditLogResponse(
        Long id,
        Instant createdAt,
        String actorName,
        AdminAction action,
        AdminTargetType targetType,
        String targetCode,
        String targetLabel,
        JsonNode details) {
}
