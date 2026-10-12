package com.edugame.game.service;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import com.edugame.common.exception.BusinessException;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * Checks an item against its template's {@code config_schema}: the item type is allowed, and {@code content} /
 * {@code solution} are objects carrying their top-level {@code required} fields. Item types whose solution points
 * into the content (choices, pairs, cards) are also checked for consistency: unique ids, and a solution that only
 * references ids of the content.
 * <p>
 * The new puzzle items are checked the same way: a crossword row's key letter is inside its answer, an ordering
 * lists every entry once, a sorting puts cards into existing groups.
 * <p>
 * Deliberately lenient on text (no full JSON Schema engine): blank texts are fine, so half-written drafts can be
 * saved. A missing solution is allowed while editing.
 */
@Component
public class GameItemValidator {

    static final int MAX_OPTIONS = 6;
    static final int MAX_PAIRS = 12;
    static final int MAX_CARDS = MAX_PAIRS * 2;
    static final int MAX_ANSWER_LETTERS = 15;
    static final int MAX_ORDER_ENTRIES = 8;
    static final int MAX_GROUPS = 4;
    static final int MAX_SORT_CARDS = 16;

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

        switch (itemType) {
            case "SINGLE_CHOICE" -> validateChoice(content, solution, 2, MAX_OPTIONS);
            case "TRUE_FALSE" -> validateChoice(content, solution, 2, 2);
            case "PAIR_SET" -> validatePairSet(content, solution);
            case "CARD_SET" -> validateCardSet(content, solution);
            case "CROSSWORD_ROW" -> validateCrosswordRow(content, solution);
            case "ORDER_SET" -> validateOrderSet(content, solution);
            case "SORT_SET" -> validateSortSet(content, solution);
            default -> {
                // No cross-field rules (OPEN_QUESTION, WHEEL_SEGMENT...).
            }
        }
    }

    /** {@code content.options} of {@code min..max} choices; {@code solution.correct} names exactly one of them. */
    private static void validateChoice(JsonNode content, JsonNode solution, int min, int max) {
        List<String> optionIds = ids("content.options", content.path("options"), min, max);
        if (solution == null) {
            return;
        }
        List<String> correct = strings("solution.correct", solution.path("correct"));
        if (correct.size() != 1) {
            throw invalid("solution.correct must name exactly one option");
        }
        if (!optionIds.contains(correct.getFirst())) {
            throw invalid("solution.correct refers to unknown option %s".formatted(correct.getFirst()));
        }
    }

    /** Two columns with ids unique across both; each pair joins a left id to a right id, each id used once. */
    private static void validatePairSet(JsonNode content, JsonNode solution) {
        List<String> left = ids("content.left", content.path("left"), 1, MAX_PAIRS);
        List<String> right = ids("content.right", content.path("right"), 1, MAX_PAIRS);
        requireDistinct("content.left / content.right", concat(left, right));
        if (solution == null) {
            return;
        }
        Set<String> used = new HashSet<>();
        for (List<String> pair : pairs(solution)) {
            if (!left.contains(pair.get(0)) || !right.contains(pair.get(1))) {
                throw invalid("solution.pairs %s must join a left id to a right id".formatted(pair));
            }
            requireUnused(used, pair);
        }
    }

    /** Cards with unique ids; each pair joins two different cards, each card used once. */
    private static void validateCardSet(JsonNode content, JsonNode solution) {
        List<String> cards = ids("content.cards", content.path("cards"), 2, MAX_CARDS);
        if (solution == null) {
            return;
        }
        Set<String> used = new HashSet<>();
        for (List<String> pair : pairs(solution)) {
            if (!cards.contains(pair.get(0)) || !cards.contains(pair.get(1))) {
                throw invalid("solution.pairs %s refers to an unknown card".formatted(pair));
            }
            requireUnused(used, pair);
        }
    }

    /**
     * A clue, and an answer of 1-15 letters (spaces do not count) with {@code keyIndex} naming the letter that sits in
     * the keyword column.
     */
    private static void validateCrosswordRow(JsonNode content, JsonNode solution) {
        if (!content.path("clue").isTextual()) {
            throw invalid("content.clue must be a string");
        }
        if (solution == null) {
            return;
        }
        if (!solution.path("answer").isTextual()) {
            throw invalid("solution.answer must be a string");
        }
        int letters = answerLetters(solution.path("answer").asText());
        if (letters < 1 || letters > MAX_ANSWER_LETTERS) {
            throw invalid("solution.answer must have 1-%d letters".formatted(MAX_ANSWER_LETTERS));
        }
        JsonNode keyIndex = solution.path("keyIndex");
        if (!keyIndex.isIntegralNumber() || keyIndex.asInt() < 0 || keyIndex.asInt() >= letters) {
            throw invalid("solution.keyIndex must point at a letter of the answer (0-%d)".formatted(letters - 1));
        }
    }

    /** Letters of a crossword answer as the board shows them: NFC code points, spaces left out. */
    static int answerLetters(String answer) {
        String letters = Normalizer.normalize(answer, Normalizer.Form.NFC).replaceAll("\\s+", "");
        return letters.codePointCount(0, letters.length());
    }

    /** 2-8 entries; {@code solution.order} lists every entry id exactly once. */
    private static void validateOrderSet(JsonNode content, JsonNode solution) {
        List<String> entries = ids("content.items", content.path("items"), 2, MAX_ORDER_ENTRIES);
        if (solution == null) {
            return;
        }
        List<String> order = strings("solution.order", solution.path("order"));
        if (order.size() != entries.size() || !new HashSet<>(order).equals(new HashSet<>(entries))) {
            throw invalid("solution.order must list every entry of content.items exactly once");
        }
    }

    /** 2-4 groups and 1-16 cards, ids unique across both; each card is put in at most one existing group. */
    private static void validateSortSet(JsonNode content, JsonNode solution) {
        List<String> groups = ids("content.groups", content.path("groups"), 2, MAX_GROUPS);
        List<String> cards = ids("content.cards", content.path("cards"), 1, MAX_SORT_CARDS);
        requireDistinct("content.groups / content.cards", concat(groups, cards));
        if (solution == null) {
            return;
        }
        JsonNode assign = solution.path("assign");
        if (!assign.isArray()) {
            throw invalid("solution.assign must be an array");
        }
        Set<String> placed = new HashSet<>();
        for (JsonNode entry : assign) {
            List<String> pair = strings("solution.assign[]", entry);
            if (pair.size() != 2 || !cards.contains(pair.get(0)) || !groups.contains(pair.get(1))) {
                throw invalid("solution.assign %s must put a card into a group".formatted(pair));
            }
            if (!placed.add(pair.get(0))) {
                throw invalid("%s is put in more than one group".formatted(pair.get(0)));
            }
        }
    }

    /** Ids of an array of {@code {id, ...}} objects: {@code min..max} entries, non-blank and distinct. */
    private static List<String> ids(String name, JsonNode array, int min, int max) {
        if (!array.isArray()) {
            throw invalid("%s must be an array".formatted(name));
        }
        if (array.size() < min || array.size() > max) {
            throw invalid("%s must have %s entries".formatted(name, min == max ? min : min + "-" + max));
        }
        List<String> ids = new ArrayList<>();
        for (JsonNode entry : array) {
            if (!entry.isObject() || !entry.path("id").isTextual() || entry.path("id").asText().isBlank()) {
                throw invalid("every entry of %s needs a non-blank string id".formatted(name));
            }
            JsonNode text = entry.path("text");
            if (!text.isMissingNode() && !text.isNull() && !text.isTextual()) {
                throw invalid("%s[].text must be a string".formatted(name));
            }
            ids.add(entry.path("id").asText());
        }
        requireDistinct(name, ids);
        return ids;
    }

    private static List<List<String>> pairs(JsonNode solution) {
        JsonNode pairs = solution.path("pairs");
        if (!pairs.isArray() || pairs.isEmpty()) {
            throw invalid("solution.pairs must be a non-empty array");
        }
        List<List<String>> result = new ArrayList<>();
        for (JsonNode pair : pairs) {
            List<String> ids = strings("solution.pairs[]", pair);
            if (ids.size() != 2) {
                throw invalid("every entry of solution.pairs must hold exactly two ids");
            }
            result.add(ids);
        }
        return result;
    }

    private static List<String> strings(String name, JsonNode array) {
        if (!array.isArray()) {
            throw invalid("%s must be an array of ids".formatted(name));
        }
        List<String> values = new ArrayList<>();
        for (JsonNode value : array) {
            if (!value.isTextual()) {
                throw invalid("%s must be an array of ids".formatted(name));
            }
            values.add(value.asText());
        }
        return values;
    }

    private static void requireUnused(Set<String> used, List<String> pair) {
        for (String id : pair) {
            if (!used.add(id)) {
                throw invalid("%s is used in more than one pair".formatted(id));
            }
        }
    }

    private static void requireDistinct(String name, List<String> ids) {
        if (new HashSet<>(ids).size() != ids.size()) {
            throw invalid("%s has duplicate ids".formatted(name));
        }
    }

    private static List<String> concat(List<String> a, List<String> b) {
        List<String> all = new ArrayList<>(a);
        all.addAll(b);
        return all;
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
