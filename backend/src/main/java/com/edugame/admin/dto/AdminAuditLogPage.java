package com.edugame.admin.dto;

import java.util.List;

/** A page of the admin log, newest first, and how many lines match in all. */
public record AdminAuditLogPage(List<AdminAuditLogResponse> items, long total) {
}
