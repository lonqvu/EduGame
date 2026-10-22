package com.edugame.admin.service;

import java.util.Collection;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;

import com.edugame.admin.domain.AdminAction;
import com.edugame.admin.domain.AdminAuditLog;
import com.edugame.admin.domain.AdminTargetType;
import com.edugame.admin.dto.AdminAuditLogPage;
import com.edugame.admin.dto.AdminAuditLogResponse;
import com.edugame.admin.mapper.AdminAuditLogMapper;
import com.edugame.admin.repository.AdminAuditLogRepository;
import com.edugame.user.domain.User;
import com.edugame.user.service.CurrentUserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** The admin log: every change an admin makes is written in the same transaction as the change itself. */
@Service
@RequiredArgsConstructor
public class AdminAuditService {

    public static final int MAX_PAGE_SIZE = 200;

    private final AdminAuditLogRepository repository;
    private final AdminAuditLogMapper mapper;
    private final CurrentUserService currentUserService;
    private final ObjectMapper objectMapper;

    /**
     * Records what the signed-in admin just did. Must run inside the transaction of the change: if the change is
     * rolled back, so is its line.
     *
     * @param details small values that say what changed ({@code null} values are left out)
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void record(AdminAction action, AdminTargetType targetType, String targetCode, String targetLabel,
                       Map<String, ?> details) {
        User actor = currentUserService.getCurrentUser();
        ObjectNode json = objectMapper.createObjectNode();
        details.forEach((key, value) -> {
            if (value != null) {
                json.set(key, objectMapper.valueToTree(value));
            }
        });
        repository.save(AdminAuditLog.of(actor.getId(), actor.getDisplayName(), action, targetType, targetCode,
                targetLabel, json));
    }

    /** Newest first; {@code actions} empty: every action. */
    @Transactional(readOnly = true)
    public AdminAuditLogPage list(Collection<AdminAction> actions, int page, int size) {
        Collection<AdminAction> wanted = actions == null || actions.isEmpty() ? EnumSet.allOf(AdminAction.class) : actions;
        Page<AdminAuditLog> found = repository.findByActionIn(wanted, PageRequest.of(Math.max(0, page),
                Math.clamp(size, 1, MAX_PAGE_SIZE), Sort.by(Sort.Direction.DESC, "createdAt", "id")));
        return new AdminAuditLogPage(mapper.toResponses(found.getContent()), found.getTotalElements());
    }

    /** The latest actions on one teacher or feedback. */
    @Transactional(readOnly = true)
    public List<AdminAuditLogResponse> historyOf(AdminTargetType targetType, String targetCode) {
        return mapper.toResponses(
                repository.findTop20ByTargetTypeAndTargetCodeOrderByCreatedAtDescIdDesc(targetType, targetCode));
    }
}
