package com.edugame.catalog.dto;

import com.edugame.catalog.domain.GameTemplateStatus;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;

/**
 * @param configSchema item types and the JSON shape of settings / item content / solution
 * @param defaultConfig settings a new game starts with
 */
public record GameTemplateResponse(
        String code,
        String categoryCode,
        String categoryName,
        String engine,
        String name,
        String description,
        String icon,
        String thumbnailUrl,
        @JsonProperty("isNew") boolean isNew,
        GameTemplateStatus status,
        JsonNode configSchema,
        JsonNode defaultConfig) {
}
