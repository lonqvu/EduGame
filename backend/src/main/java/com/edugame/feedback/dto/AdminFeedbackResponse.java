package com.edugame.feedback.dto;

import java.time.Instant;

import com.edugame.feedback.domain.FeedbackKind;
import com.edugame.feedback.domain.FeedbackStatus;

/**
 * A feedback in the admin list.
 *
 * @param teacher       who wrote it; none once the account is deleted
 * @param device        "Chrome trên Windows", from the browser's User-Agent
 * @param screenshotUrl the screenshot (admin token needed), if one was sent
 */
public record AdminFeedbackResponse(
        String code,
        FeedbackKind kind,
        Short rating,
        String message,
        String page,
        String viewport,
        String appVersion,
        String device,
        boolean contactOk,
        FeedbackStatus status,
        Instant createdAt,
        Teacher teacher,
        String screenshotUrl) {

    public record Teacher(String code, String displayName, String email) {
    }
}
