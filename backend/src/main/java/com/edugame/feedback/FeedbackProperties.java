package com.edugame.feedback;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Settings bound from {@code app.feedback.*}.
 *
 * @param notifyTo addresses each new feedback is mailed to; none: it is only stored
 */
@ConfigurationProperties(prefix = "app.feedback")
public record FeedbackProperties(List<String> notifyTo) {

    public FeedbackProperties {
        notifyTo = notifyTo == null ? List.of() : notifyTo.stream().map(String::strip).filter(a -> !a.isEmpty()).toList();
    }
}
