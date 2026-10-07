package com.edugame.common.exception;

import java.time.Instant;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Uniform error body returned by every REST endpoint.
 */
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public record ApiError(
        Instant timestamp,
        int status,
        String code,
        String message,
        String path,
        List<FieldViolation> violations) {

    public record FieldViolation(String field, String message) {
    }
}
