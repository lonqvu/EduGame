package com.edugame.feedback.dto;

import com.edugame.feedback.domain.FeedbackKind;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * A feedback from the app (multipart part {@code feedback}, the screenshot being part {@code screenshot}).
 *
 * @param rating     1-5, or none
 * @param page       path and query of the page the teacher was on, e.g. {@code /games/g-abc/edit}
 * @param viewport   browser window, e.g. {@code 1366x768}
 * @param appVersion build of the app
 * @param contactOk  the team may write back to the teacher's email
 */
public record FeedbackRequest(
        @NotNull FeedbackKind kind,
        @Min(1) @Max(5) Integer rating,
        @NotBlank @Size(max = FeedbackRules.MAX_MESSAGE) String message,
        @Size(max = 500) String page,
        @Size(max = 20) String viewport,
        @Size(max = 40) String appVersion,
        boolean contactOk) {

    public FeedbackRequest {
        message = message == null ? null : message.strip();
    }
}
