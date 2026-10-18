package com.edugame.feedback.domain;

import com.edugame.common.entity.CreatedEntity;
import com.edugame.user.domain.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** What a teacher wrote from "Góp ý", and where they were. Table {@code feedback}. */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "feedback")
public class Feedback extends CreatedEntity {

    @Column(name = "code", nullable = false, length = 32, updatable = false)
    private String code;

    /** Null once the account is deleted. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", updatable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false, length = 20, updatable = false)
    private FeedbackKind kind;

    /** 1-5, or none. */
    @Column(name = "rating", updatable = false)
    private Short rating;

    @Column(name = "message", nullable = false, updatable = false)
    private String message;

    /** Path and query of the page the teacher was on. */
    @Column(name = "page", length = 500, updatable = false)
    private String page;

    /** Browser window, "1366x768". */
    @Column(name = "viewport", length = 20, updatable = false)
    private String viewport;

    @Column(name = "app_version", length = 40, updatable = false)
    private String appVersion;

    @Column(name = "user_agent", length = 500, updatable = false)
    private String userAgent;

    /** The teacher agrees to be written back to. */
    @Column(name = "contact_ok", nullable = false, updatable = false)
    private boolean contactOk;

    @Setter
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private FeedbackStatus status = FeedbackStatus.NEW;

    public static Feedback create(String code, User user, FeedbackKind kind, Short rating, String message) {
        Feedback feedback = new Feedback();
        feedback.code = code;
        feedback.user = user;
        feedback.kind = kind;
        feedback.rating = rating;
        feedback.message = message;
        return feedback;
    }

    /** Where it was written from; values are cut to their columns. */
    public Feedback from(String page, String viewport, String appVersion, String userAgent, boolean contactOk) {
        this.page = cut(page, 500);
        this.viewport = cut(viewport, 20);
        this.appVersion = cut(appVersion, 40);
        this.userAgent = cut(userAgent, 500);
        this.contactOk = contactOk;
        return this;
    }

    private static String cut(String value, int max) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String stripped = value.strip();
        return stripped.length() <= max ? stripped : stripped.substring(0, max);
    }
}
