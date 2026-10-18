package com.edugame.feedback.domain;

/** What the teacher writes about (ck_feedback_kind). */
public enum FeedbackKind {
    /** "Báo lỗi": something does not work. */
    BUG("Báo lỗi"),
    /** "Đề xuất": an idea, a missing feature. */
    IDEA("Đề xuất"),
    /** "Khen": what the teacher likes. */
    PRAISE("Khen"),
    OTHER("Khác");

    private final String label;

    FeedbackKind(String label) {
        this.label = label;
    }

    /** The Vietnamese name, as in the app. */
    public String label() {
        return label;
    }
}
