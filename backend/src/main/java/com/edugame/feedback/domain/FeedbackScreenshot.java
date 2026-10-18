package com.edugame.feedback.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** The screenshot sent with a feedback, if any. Table {@code feedback_screenshot}. */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "feedback_screenshot")
public class FeedbackScreenshot {

    @Id
    @Column(name = "feedback_id")
    private Long feedbackId;

    @Column(name = "content_type", nullable = false, length = 50)
    private String contentType;

    @Column(name = "data", nullable = false)
    private byte[] data;

    @Column(name = "size_bytes", nullable = false)
    private int sizeBytes;

    public static FeedbackScreenshot of(Long feedbackId, String contentType, byte[] data) {
        FeedbackScreenshot screenshot = new FeedbackScreenshot();
        screenshot.feedbackId = feedbackId;
        screenshot.contentType = contentType;
        screenshot.data = data;
        screenshot.sizeBytes = data.length;
        return screenshot;
    }
}
