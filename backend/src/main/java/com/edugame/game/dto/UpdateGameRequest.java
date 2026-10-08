package com.edugame.game.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Partial update: a {@code null} field is left unchanged.
 *
 * @param settings replaces the settings of the version being edited (a JSON object)
 */
public record UpdateGameRequest(
        @Size(max = 255) @Pattern(regexp = "(?s).*\\S.*", message = "must not be blank") String title,
        @Size(max = 2000) String description,
        @Size(max = 50) String subject,
        Short grade,
        JsonNode settings) {
}
