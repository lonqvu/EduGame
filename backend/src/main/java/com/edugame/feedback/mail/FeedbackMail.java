package com.edugame.feedback.mail;

import java.time.Instant;

import com.edugame.feedback.domain.FeedbackKind;

/**
 * A new feedback, published inside the transaction that stores it and mailed to the team by {@link FeedbackMailer}
 * once it commits.
 *
 * @param teacherEmail      reply address, only when the teacher agreed to be written back to
 * @param screenshot        the picture, or none
 * @param screenshotType    its media type
 */
public record FeedbackMail(
        String code,
        FeedbackKind kind,
        Short rating,
        String message,
        String teacherName,
        String teacherEmail,
        String page,
        String device,
        String viewport,
        String appVersion,
        Instant at,
        byte[] screenshot,
        String screenshotType) {

    /** Keeps the message and the picture out of logs. */
    @Override
    public String toString() {
        return "FeedbackMail[code=%s, kind=%s]".formatted(code, kind);
    }
}
