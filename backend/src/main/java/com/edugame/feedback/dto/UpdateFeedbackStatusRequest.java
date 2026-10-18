package com.edugame.feedback.dto;

import com.edugame.feedback.domain.FeedbackStatus;
import jakarta.validation.constraints.NotNull;

/** The admin read it, or dealt with it. */
public record UpdateFeedbackStatusRequest(@NotNull FeedbackStatus status) {
}
