package com.edugame.game.dto;

import java.time.Instant;
import java.util.List;

import com.edugame.game.domain.EducationLevel;
import com.edugame.game.domain.GameStatus;
import com.edugame.game.domain.GameVersionStatus;
import com.edugame.game.domain.GameVisibility;
import com.fasterxml.jackson.databind.JsonNode;

/**
 * A game as the editor sees it: the version being edited (the DRAFT if there is one, else the last published)
 * with its settings and items. Item ids change when editing a published game creates a new draft, so clients
 * replace their item list with the one in every response.
 */
public record GameResponse(
        String code,
        String templateCode,
        String title,
        String description,
        String subject,
        EducationLevel educationLevel,
        Short grade,
        GameVisibility visibility,
        GameStatus status,
        int version,
        GameVersionStatus versionStatus,
        JsonNode settings,
        List<GameItemResponse> items,
        Instant updatedAt) {
}
