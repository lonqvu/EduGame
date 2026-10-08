package com.edugame.game.service;

import java.util.ArrayList;
import java.util.List;

import com.edugame.common.exception.BusinessException;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * Checks an item against its template's {@code config_schema}: the item type is allowed, and {@code content} /
 * {@code solution} are objects carrying their top-level {@code required} fields.
 * <p>
 * Deliberately shallow (no full JSON Schema engine): it catches wrong payloads from the editor without
 * rejecting half-written drafts. A missing solution is allowed while editing.
 */
@Component
public class GameItemValidator {

    public void validate(JsonNode configSchema, String itemType, JsonNode content, JsonNode solution) {
        List<String> allowed = new ArrayList<>();
        configSchema.path("itemTypes").forEach(type -> allowed.add(type.asText()));
        if (!allowed.contains(itemType)) {
            throw invalid("Item type %s is not allowed here; expected one of %s".formatted(itemType, allowed));
        }

        requireObjectWithFields("content", content, configSchema.path("content"));

        JsonNode solutionSchema = configSchema.path("solution");
        if (solution != null && "null".equals(solutionSchema.path("type").asText())) {
            throw invalid("Items of type %s have no solution".formatted(itemType));
        }
        if (solution != null) {
            requireObjectWithFields("solution", solution, solutionSchema);
        }
    }

    private static void requireObjectWithFields(String name, JsonNode value, JsonNode schema) {
        if (!value.isObject()) {
            throw invalid("%s must be a JSON object".formatted(name));
        }
        for (JsonNode field : schema.path("required")) {
            if (!value.hasNonNull(field.asText())) {
                throw invalid("%s.%s is required".formatted(name, field.asText()));
            }
        }
    }

    private static BusinessException invalid(String message) {
        return new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_GAME_ITEM", message);
    }
}
