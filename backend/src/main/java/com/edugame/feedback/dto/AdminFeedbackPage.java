package com.edugame.feedback.dto;

import java.util.List;

/** A page of the admin list, newest first, and how many match in all. */
public record AdminFeedbackPage(List<AdminFeedbackResponse> items, long total) {
}
