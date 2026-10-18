package com.edugame.feedback.dto;

/** Limits of "Góp ý", shared by the requests and the service (the app shows the same ones). */
public final class FeedbackRules {

    public static final int MAX_MESSAGE = 2000;
    /** A screenshot, as the app sends it (shrunk to 1600 px); larger files are refused. */
    public static final int MAX_SCREENSHOT_BYTES = 3 * 1024 * 1024;
    /** Feedback one teacher can send in an hour, so a stuck button or a script cannot flood the team's inbox. */
    public static final int MAX_PER_HOUR = 10;

    private FeedbackRules() {
    }
}
