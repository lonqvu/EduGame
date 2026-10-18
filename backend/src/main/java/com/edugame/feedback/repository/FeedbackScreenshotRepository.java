package com.edugame.feedback.repository;

import java.util.Collection;
import java.util.Set;

import com.edugame.feedback.domain.FeedbackScreenshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface FeedbackScreenshotRepository extends JpaRepository<FeedbackScreenshot, Long> {

    /** Which of these feedbacks have a screenshot, without loading the pictures. */
    @Query("select s.feedbackId from FeedbackScreenshot s where s.feedbackId in :feedbackIds")
    Set<Long> findIdsAmong(Collection<Long> feedbackIds);
}
