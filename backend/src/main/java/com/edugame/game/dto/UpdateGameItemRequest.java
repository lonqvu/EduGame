package com.edugame.game.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.Size;

/**
 * Partial update: an omitted field is left unchanged. {@code "solution": null} removes the solution and
 * {@code "explanation": ""} removes the explanation.
 */
public record UpdateGameItemRequest(
        JsonNode content,
        JsonNode solution,
        @Size(max = 2000) String explanation) {
}
