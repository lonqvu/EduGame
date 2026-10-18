package com.edugame.feedback.dto;

import java.time.Instant;

/** The feedback as stored: its code to quote when writing about it. */
public record FeedbackResponse(String code, Instant createdAt) {
}
