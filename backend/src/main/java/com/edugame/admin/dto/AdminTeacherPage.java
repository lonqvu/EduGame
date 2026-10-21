package com.edugame.admin.dto;

import java.util.List;

/** A page of the admin list of accounts, and how many match in all. */
public record AdminTeacherPage(List<AdminTeacherSummaryResponse> items, long total) {
}
