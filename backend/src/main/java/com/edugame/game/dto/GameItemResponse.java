package com.edugame.game.dto;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * One question / card set / wheel segment. Shape of {@code content} and {@code solution} depends on the template
 * (see {@code configSchema}), e.g. GRID_BOARD: {@code {"text", "image", "points"}} / {@code {"answer"}}.
 * <p>
 * {@code solution} is included because only the owner can read this; never send it to a student device.
 */
public record GameItemResponse(
        Long id,
        String itemType,
        int position,
        JsonNode content,
        JsonNode solution,
        String explanation) {
}
