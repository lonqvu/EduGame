package com.edugame.admin.mapper;

import java.util.List;

import com.edugame.admin.domain.AdminAuditLog;
import com.edugame.admin.dto.AdminAuditLogResponse;
import org.mapstruct.Mapper;

@Mapper
public interface AdminAuditLogMapper {

    AdminAuditLogResponse toResponse(AdminAuditLog entry);

    List<AdminAuditLogResponse> toResponses(List<AdminAuditLog> entries);
}
