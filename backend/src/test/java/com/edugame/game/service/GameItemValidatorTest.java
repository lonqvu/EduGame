package com.edugame.game.service;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.edugame.common.exception.BusinessException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class GameItemValidatorTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final GameItemValidator validator = new GameItemValidator();

    private final JsonNode gridBoardSchema = json("""
            {"itemTypes": ["OPEN_QUESTION"],
             "content":  {"type": "object", "required": ["text", "points"]},
             "solution": {"type": "object", "required": ["answer"]}}
            """);

    private final JsonNode wheelSchema = json("""
            {"itemTypes": ["WHEEL_SEGMENT"],
             "content":  {"type": "object", "required": ["label"]},
             "solution": {"type": "null"}}
            """);

    @Test
    void acceptsCompleteItem() {
        assertThatCode(() -> validator.validate(gridBoardSchema, "OPEN_QUESTION",
                json("{\"text\": \"25 + 13 = ?\", \"points\": 10}"), json("{\"answer\": \"38\"}")))
                .doesNotThrowAnyException();
    }

    @Test
    void acceptsDraftWithoutSolution() {
        assertThatCode(() -> validator.validate(gridBoardSchema, "OPEN_QUESTION",
                json("{\"text\": \"\", \"points\": 20}"), null))
                .doesNotThrowAnyException();
    }

    @Test
    void rejectsUnknownItemType() {
        assertInvalid(() -> validator.validate(gridBoardSchema, "SINGLE_CHOICE",
                json("{\"text\": \"x\", \"points\": 10}"), null), "not allowed");
    }

    @Test
    void rejectsMissingRequiredContentField() {
        assertInvalid(() -> validator.validate(gridBoardSchema, "OPEN_QUESTION",
                json("{\"text\": \"x\"}"), null), "content.points is required");
    }

    @Test
    void rejectsNonObjectContent() {
        assertInvalid(() -> validator.validate(gridBoardSchema, "OPEN_QUESTION",
                json("[1, 2]"), null), "content must be a JSON object");
    }

    @Test
    void rejectsSolutionMissingRequiredField() {
        assertInvalid(() -> validator.validate(gridBoardSchema, "OPEN_QUESTION",
                json("{\"text\": \"x\", \"points\": 10}"), json("{}")), "solution.answer is required");
    }

    @Test
    void rejectsSolutionForGamesWithoutAnswers() {
        assertInvalid(() -> validator.validate(wheelSchema, "WHEEL_SEGMENT",
                json("{\"label\": \"Hát 1 bài\"}"), json("{\"answer\": \"x\"}")), "no solution");
    }

    private static void assertInvalid(org.assertj.core.api.ThrowableAssert.ThrowingCallable call, String message) {
        assertThatThrownBy(call)
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("code", "INVALID_GAME_ITEM")
                .hasMessageContaining(message);
    }

    private JsonNode json(String text) {
        try {
            return objectMapper.readTree(text);
        } catch (Exception e) {
            throw new IllegalArgumentException(e);
        }
    }
}
