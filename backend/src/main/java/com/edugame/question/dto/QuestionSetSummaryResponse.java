package com.edugame.question.dto;

import java.time.Instant;

import com.edugame.question.domain.Subject;

/**
 * A set in the teacher's bank with its numbers.
 *
 * @param useCount  games made from the set
 * @param playCount times those games were played with a class
 */
public record QuestionSetSummaryResponse(
        String code,
        String title,
        String description,
        Subject subject,
        Short grade,
        long questionCount,
        long multipleChoiceCount,
        long shortAnswerCount,
        long useCount,
        long playCount,
        String ownerName,
        Instant createdAt,
        Instant updatedAt) {
}
