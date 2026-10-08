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


    private final JsonNode quizSchema = json("""
            {"itemTypes": ["SINGLE_CHOICE", "TRUE_FALSE"],
             "content":  {"type": "object", "required": ["text", "options"]},
             "solution": {"type": "object", "required": ["correct"]}}
            """);

    private final JsonNode matchingSchema = json("""
            {"itemTypes": ["PAIR_SET"],
             "content":  {"type": "object", "required": ["left", "right"]},
             "solution": {"type": "object", "required": ["pairs"]}}
            """);

    private final JsonNode memorySchema = json("""
            {"itemTypes": ["CARD_SET"],
             "content":  {"type": "object", "required": ["cards"]},
             "solution": {"type": "object", "required": ["pairs"]}}
            """);

    private static final String THREE_OPTIONS = """
            {"text": "2 + 2 = ?", "options": [{"id": "a", "text": "3"}, {"id": "b", "text": "4"}, {"id": "c", "text": ""}]}
            """;

    private static final String TWO_PAIRS = """
            {"left": [{"id": "l1", "text": "Mèo"}, {"id": "l2", "text": "Chó"}],
             "right": [{"id": "r1", "text": "Meo meo"}, {"id": "r2", "text": "Gâu gâu"}]}
            """;

    private static final String FOUR_CARDS = """
            {"cards": [{"id": "a1", "text": "Mèo"}, {"id": "b1", "text": "Meo meo"},
                       {"id": "a2", "text": "Chó"}, {"id": "b2", "text": "Gâu gâu"}]}
            """;

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


    // --- QUIZ ---------------------------------------------------------------------------------------------------

    @Test
    void acceptsSingleChoiceWithBlankOptionWhileDrafting() {
        assertThatCode(() -> validator.validate(quizSchema, "SINGLE_CHOICE", json(THREE_OPTIONS),
                json("{\"correct\": [\"b\"]}")))
                .doesNotThrowAnyException();
        assertThatCode(() -> validator.validate(quizSchema, "SINGLE_CHOICE", json(THREE_OPTIONS), null))
                .doesNotThrowAnyException();
    }

    @Test
    void rejectsCorrectAnswerThatIsNotAnOption() {
        assertInvalid(() -> validator.validate(quizSchema, "SINGLE_CHOICE", json(THREE_OPTIONS),
                json("{\"correct\": [\"z\"]}")), "unknown option z");
    }

    @Test
    void rejectsSeveralCorrectAnswers() {
        assertInvalid(() -> validator.validate(quizSchema, "SINGLE_CHOICE", json(THREE_OPTIONS),
                json("{\"correct\": [\"a\", \"b\"]}")), "exactly one option");
        assertInvalid(() -> validator.validate(quizSchema, "SINGLE_CHOICE", json(THREE_OPTIONS),
                json("{\"correct\": []}")), "exactly one option");
    }

    @Test
    void rejectsTooFewOrTooManyOptions() {
        assertInvalid(() -> validator.validate(quizSchema, "SINGLE_CHOICE",
                json("{\"text\": \"x\", \"options\": [{\"id\": \"a\", \"text\": \"1\"}]}"), null),
                "content.options must have 2-6 entries");
        String seven = "[" + "abcdefg".chars().mapToObj(c -> "{\"id\": \"" + (char) c + "\"}")
                .reduce((x, y) -> x + "," + y).orElseThrow() + "]";
        assertInvalid(() -> validator.validate(quizSchema, "SINGLE_CHOICE",
                json("{\"text\": \"x\", \"options\": " + seven + "}"), null), "2-6 entries");
    }

    @Test
    void rejectsDuplicateOrBlankOptionIds() {
        assertInvalid(() -> validator.validate(quizSchema, "SINGLE_CHOICE",
                json("{\"text\": \"x\", \"options\": [{\"id\": \"a\"}, {\"id\": \"a\"}]}"), null),
                "duplicate ids");
        assertInvalid(() -> validator.validate(quizSchema, "SINGLE_CHOICE",
                json("{\"text\": \"x\", \"options\": [{\"id\": \"a\"}, {\"id\": \" \"}]}"), null),
                "non-blank string id");
        assertInvalid(() -> validator.validate(quizSchema, "SINGLE_CHOICE",
                json("{\"text\": \"x\", \"options\": [{\"id\": \"a\"}, {\"id\": 2}]}"), null),
                "non-blank string id");
    }

    @Test
    void rejectsNonStringOptionText() {
        assertInvalid(() -> validator.validate(quizSchema, "SINGLE_CHOICE",
                json("{\"text\": \"x\", \"options\": [{\"id\": \"a\", \"text\": 1}, {\"id\": \"b\"}]}"),
                null), "text must be a string");
    }

    @Test
    void trueFalseHasExactlyTwoOptions() {
        String trueFalse = "{\"text\": \"Cá sống dưới nước\", \"options\": "
                + "[{\"id\": \"true\", \"text\": \"Đúng\"}, {\"id\": \"false\", \"text\": \"Sai\"}]}";
        assertThatCode(() -> validator.validate(quizSchema, "TRUE_FALSE", json(trueFalse),
                json("{\"correct\": [\"true\"]}")))
                .doesNotThrowAnyException();
        assertInvalid(() -> validator.validate(quizSchema, "TRUE_FALSE", json(THREE_OPTIONS), null),
                "content.options must have 2 entries");
    }

    // --- MATCHING -----------------------------------------------------------------------------------------------

    @Test
    void acceptsPairSet() {
        assertThatCode(() -> validator.validate(matchingSchema, "PAIR_SET", json(TWO_PAIRS),
                json("{\"pairs\": [[\"l1\", \"r1\"], [\"l2\", \"r2\"]]}")))
                .doesNotThrowAnyException();
    }

    @Test
    void rejectsPairJoiningTheWrongSides() {
        assertInvalid(() -> validator.validate(matchingSchema, "PAIR_SET", json(TWO_PAIRS),
                json("{\"pairs\": [[\"r1\", \"l1\"]]}")), "must join a left id to a right id");
        assertInvalid(() -> validator.validate(matchingSchema, "PAIR_SET", json(TWO_PAIRS),
                json("{\"pairs\": [[\"l1\", \"x\"]]}")), "must join a left id to a right id");
    }

    @Test
    void rejectsIdUsedInTwoPairs() {
        assertInvalid(() -> validator.validate(matchingSchema, "PAIR_SET", json(TWO_PAIRS),
                json("{\"pairs\": [[\"l1\", \"r1\"], [\"l1\", \"r2\"]]}")), "l1 is used in more than one pair");
    }

    @Test
    void rejectsSameIdOnBothSides() {
        assertInvalid(() -> validator.validate(matchingSchema, "PAIR_SET",
                json("{\"left\": [{\"id\": \"x\"}], \"right\": [{\"id\": \"x\"}]}"), null), "duplicate ids");
    }

    @Test
    void rejectsMalformedPairs() {
        assertInvalid(() -> validator.validate(matchingSchema, "PAIR_SET", json(TWO_PAIRS),
                json("{\"pairs\": [[\"l1\"]]}")), "exactly two ids");
        assertInvalid(() -> validator.validate(matchingSchema, "PAIR_SET", json(TWO_PAIRS),
                json("{\"pairs\": []}")), "non-empty array");
        assertInvalid(() -> validator.validate(matchingSchema, "PAIR_SET", json(TWO_PAIRS),
                json("{\"pairs\": [[\"l1\", 3]]}")), "array of ids");
        assertInvalid(() -> validator.validate(matchingSchema, "PAIR_SET",
                json("{\"left\": {}, \"right\": []}"), null), "content.left must be an array");
    }

    // --- MEMORY -------------------------------------------------------------------------------------------------

    @Test
    void acceptsCardSet() {
        assertThatCode(() -> validator.validate(memorySchema, "CARD_SET", json(FOUR_CARDS),
                json("{\"pairs\": [[\"a1\", \"b1\"], [\"a2\", \"b2\"]]}")))
                .doesNotThrowAnyException();
    }

    @Test
    void rejectsCardPairWithUnknownOrReusedCard() {
        assertInvalid(() -> validator.validate(memorySchema, "CARD_SET", json(FOUR_CARDS),
                json("{\"pairs\": [[\"a1\", \"zz\"]]}")), "unknown card");
        assertInvalid(() -> validator.validate(memorySchema, "CARD_SET", json(FOUR_CARDS),
                json("{\"pairs\": [[\"a1\", \"a1\"]]}")), "a1 is used in more than one pair");
        assertInvalid(() -> validator.validate(memorySchema, "CARD_SET", json(FOUR_CARDS),
                json("{\"pairs\": [[\"a1\", \"b1\"], [\"b1\", \"a2\"]]}")), "b1 is used in more than one pair");
    }

    @Test
    void rejectsTooManyCards() {
        String cards = "[" + java.util.stream.IntStream.rangeClosed(1, 26).mapToObj(i -> "{\"id\": \"c" + i + "\"}")
                .reduce((x, y) -> x + "," + y).orElseThrow() + "]";
        assertInvalid(() -> validator.validate(memorySchema, "CARD_SET", json("{\"cards\": " + cards + "}"), null),
                "content.cards must have 2-24 entries");
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
