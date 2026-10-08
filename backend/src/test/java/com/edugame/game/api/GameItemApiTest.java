package com.edugame.game.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

/**
 * The item API of the question games (QUIZ, MATCHING, MEMORY) end to end: HTTP, validation, JPA and the
 * PostgreSQL from docker-compose. The dev profile provides the acting teacher (Cô Lan) and her demo games; every
 * test is rolled back.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@Transactional
class GameItemApiTest {

    private static final String QUIZ_ITEM = """
            {"itemType": "SINGLE_CHOICE",
             "content": {"text": "5 + 3 = ?", "options": [{"id": "a", "text": "7"}, {"id": "b", "text": "8"},
                                                           {"id": "c", "text": "9"}]},
             "solution": {"correct": ["b"]}}
            """;

    private static final String TRUE_FALSE_ITEM = """
            {"itemType": "TRUE_FALSE",
             "content": {"text": "Cá sống dưới nước", "options": [{"id": "true", "text": "Đúng"},
                                                                  {"id": "false", "text": "Sai"}]},
             "solution": {"correct": ["true"]}}
            """;

    private static final String PAIR_SET_ITEM = """
            {"itemType": "PAIR_SET",
             "content": {"left": [{"id": "l1", "text": "Hà Nội"}, {"id": "l2", "text": "Huế"}],
                         "right": [{"id": "r1", "text": "Hồ Gươm"}, {"id": "r2", "text": "Sông Hương"}]},
             "solution": {"pairs": [["l1", "r1"], ["l2", "r2"]]}}
            """;

    private static final String CARD_SET_ITEM = """
            {"itemType": "CARD_SET",
             "content": {"cards": [{"id": "a1", "text": "3 x 4"}, {"id": "b1", "text": "12"},
                                   {"id": "a2", "text": "5 x 5"}, {"id": "b2", "text": "25"}]},
             "solution": {"pairs": [["a1", "b1"], ["a2", "b2"]]}}
            """;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void quizItemsAreSavedEditedReorderedAndDeleted() throws Exception {
        String code = createGame("QUIZ");

        JsonNode game = body(send(post(itemsPath(code)), items(QUIZ_ITEM, TRUE_FALSE_ITEM)).andExpect(status().isCreated()));
        assertThat(game.path("items")).hasSize(2);
        JsonNode first = game.path("items").get(0);
        assertThat(first.path("itemType").asText()).isEqualTo("SINGLE_CHOICE");
        assertThat(first.path("content").path("options")).hasSize(3);
        assertThat(first.path("solution").path("correct").get(0).asText()).isEqualTo("b");
        long choiceId = first.path("id").asLong();
        long trueFalseId = game.path("items").get(1).path("id").asLong();

        // Teacher picks another correct option.
        send(patch(itemPath(code, choiceId)), "{\"solution\": {\"correct\": [\"c\"]}}").andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].solution.correct[0]").value("c"));

        // A correct answer that is not an option is rejected and nothing changes.
        send(patch(itemPath(code, choiceId)), "{\"solution\": {\"correct\": [\"z\"]}}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_GAME_ITEM"));
        // Removing the option that is the correct answer, without changing the answer, is rejected too.
        send(patch(itemPath(code, choiceId)), """
                {"content": {"text": "5 + 3 = ?", "options": [{"id": "a", "text": "7"}, {"id": "b", "text": "8"}]}}
                """).andExpect(status().isBadRequest());
        mockMvc.perform(get(gamePath(code))).andExpect(jsonPath("$.items[0].solution.correct[0]").value("c"))
                .andExpect(jsonPath("$.items[0].content.options.length()").value(3));

        // Clearing the answer is fine while drafting.
        send(patch(itemPath(code, choiceId)), "{\"solution\": null}").andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].solution").doesNotExist());

        send(put(gamePath(code) + "/items/order"), "{\"itemIds\": [%d, %d]}".formatted(trueFalseId, choiceId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].itemType").value("TRUE_FALSE"))
                .andExpect(jsonPath("$.items[1].itemType").value("SINGLE_CHOICE"));

        mockMvc.perform(delete(itemPath(code, trueFalseId))).andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].position").value(0));
    }

    @Test
    void quizRejectsItemsOfOtherGames() throws Exception {
        String code = createGame("QUIZ");
        send(post(itemsPath(code)), items(PAIR_SET_ITEM)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_GAME_ITEM"));
        send(post(itemsPath(code)), items("""
                {"itemType": "SINGLE_CHOICE", "content": {"text": "x", "options": [{"id": "a", "text": "1"}]}}
                """)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("content.options must have 2-6 entries"));
        // One bad item rejects the whole batch.
        send(post(itemsPath(code)), items(QUIZ_ITEM, """
                {"itemType": "TRUE_FALSE", "content": {"text": "x", "options": [{"id": "t"}, {"id": "t"}]}}
                """)).andExpect(status().isBadRequest());
        mockMvc.perform(get(gamePath(code))).andExpect(jsonPath("$.items.length()").value(0));
    }

    @Test
    void matchingPairSetsKeepTheirPairs() throws Exception {
        String code = createGame("MATCHING");
        JsonNode game = body(send(post(itemsPath(code)), items(PAIR_SET_ITEM)).andExpect(status().isCreated()));
        JsonNode item = game.path("items").get(0);
        assertThat(item.path("content").path("left")).hasSize(2);
        assertThat(item.path("solution").path("pairs").get(1).get(1).asText()).isEqualTo("r2");

        send(patch(itemPath(code, item.path("id").asLong())), "{\"solution\": {\"pairs\": [[\"l1\", \"r1\"], [\"l2\", \"r1\"]]}}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("r1 is used in more than one pair"));
    }

    @Test
    void memoryCardSetsAndTheSeededDemoGame() throws Exception {
        // Seeded by R__dev_seed.sql: one set of 8 pairs.
        mockMvc.perform(get(gamePath("g-animals"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.templateCode").value("MEMORY"))
                .andExpect(jsonPath("$.items[0].content.cards.length()").value(16))
                .andExpect(jsonPath("$.items[0].solution.pairs.length()").value(8));

        String code = createGame("MEMORY");
        send(post(itemsPath(code)), items(CARD_SET_ITEM)).andExpect(status().isCreated())
                .andExpect(jsonPath("$.items[0].content.cards.length()").value(4));
        send(post(itemsPath(code)), items("""
                {"itemType": "CARD_SET", "content": {"cards": [{"id": "a1"}, {"id": "b1"}]},
                 "solution": {"pairs": [["a1", "nope"]]}}
                """)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_GAME_ITEM"));
    }

    @Test
    void editingAPublishedGameKeepsThePublishedItems() throws Exception {
        String code = createGame("MATCHING");
        long itemId = body(send(post(itemsPath(code)), items(PAIR_SET_ITEM))).path("items").get(0).path("id").asLong();
        mockMvc.perform(post(gamePath(code) + "/publish")).andExpect(status().isOk())
                .andExpect(jsonPath("$.versionStatus").value("PUBLISHED"));

        // The first edit copies the items into a new draft; the request may still use the published id.
        JsonNode draft = body(send(patch(itemPath(code, itemId)), """
                {"content": {"left": [{"id": "l1", "text": "Đà Nẵng"}], "right": [{"id": "r1", "text": "Cầu Rồng"}]},
                 "solution": {"pairs": [["l1", "r1"]]}}
                """).andExpect(status().isOk()));
        assertThat(draft.path("versionStatus").asText()).isEqualTo("DRAFT");
        assertThat(draft.path("items").get(0).path("id").asLong()).isNotEqualTo(itemId);
        assertThat(draft.path("items").get(0).path("content").path("left").get(0).path("text").asText())
                .isEqualTo("Đà Nẵng");
    }

    private String createGame(String templateCode) throws Exception {
        JsonNode game = body(send(post("/api/v1/games"), "{\"templateCode\": \"%s\", \"grade\": 3}".formatted(templateCode))
                .andExpect(status().isCreated()));
        return game.path("code").asText();
    }

    private ResultActions send(MockHttpServletRequestBuilder request, String json) throws Exception {
        return mockMvc.perform(request.contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private JsonNode body(ResultActions result) throws Exception {
        return objectMapper.readTree(result.andReturn().getResponse().getContentAsString());
    }

    private static String items(String... items) {
        return "{\"items\": [" + String.join(",", items) + "]}";
    }

    private static String gamePath(String code) {
        return "/api/v1/games/" + code;
    }

    private static String itemsPath(String code) {
        return gamePath(code) + "/items";
    }

    private static String itemPath(String code, long itemId) {
        return itemsPath(code) + "/" + itemId;
    }
}
