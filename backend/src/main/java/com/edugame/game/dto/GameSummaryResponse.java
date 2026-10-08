package com.edugame.game.dto;

import java.time.Instant;

import com.edugame.game.domain.EducationLevel;
import com.edugame.game.domain.GameStatus;

/** One card in the teacher's library. {@code itemCount} counts the version being edited. */
public record GameSummaryResponse(
        String code,
        String templateCode,
        String title,
        String subject,
        EducationLevel educationLevel,
        Short grade,
        GameStatus status,
        long itemCount,
        Instant updatedAt) {
}
