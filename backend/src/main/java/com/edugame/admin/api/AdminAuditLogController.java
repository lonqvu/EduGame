package com.edugame.admin.api;

import java.util.List;

import com.edugame.admin.domain.AdminAction;
import com.edugame.admin.dto.AdminAuditLogPage;
import com.edugame.admin.service.AdminAuditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Admin", description = "\"Quản trị\": overview, teachers and the admin log (role ADMIN)")
@RestController
@RequestMapping("/api/v1/admin/audit-log")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminAuditLogController {

    private final AdminAuditService auditService;

    @Operation(summary = "What admins changed, newest first; filter by action (repeatable)")
    @GetMapping
    public AdminAuditLogPage list(@RequestParam(required = false) List<AdminAction> action,
                                  @RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "50") int size) {
        return auditService.list(action, page, size);
    }
}
