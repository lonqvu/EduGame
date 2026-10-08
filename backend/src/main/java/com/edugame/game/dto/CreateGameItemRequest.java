package com.edugame.game.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateGameItemRequest(
        @NotBlank @Size(max = 50) String itemType,
        @NotNull JsonNode content,
        JsonNode solution,
        @Size(max = 2000) String explanation) {
}
