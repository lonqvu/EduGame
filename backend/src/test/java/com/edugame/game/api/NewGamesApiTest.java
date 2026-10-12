package com.edugame.game.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;

import com.edugame.game.service.GameItemValidator;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

/**
 * The games added by V7, end to end against PostgreSQL: the catalog lists them, each takes its own items and
 * rejects broken ones, the quiz-style games share the quiz items, and the demo games of the dev seed are valid.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@Transactional
class NewGamesApiTest {

    private static final String CHOICE = """
            {"itemType": "SINGLE_CHOICE",
             "content": {"text": "2 + 2 = ?", "options": [{"id": "a", "text": "3"}, {"id": "b", "text": "4"}]},
             "solution": {"correct": ["b"]}}
            """;

    private static final String TRUE_FALSE = """
            {"itemType": "TRUE_FALSE",
             "content": {"text": "Cá sống dưới nước.", "options": [{"id": "true", "text": "Đúng"}, {"id": "false", "text": "Sai"}]},
             "solution": {"correct": ["true"]}}
            """;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private GameItemValidator validator;

    @Test
    void theCatalogListsTheNewGamesAndTools() throws Exception {
        JsonNode templates = body(mockMvc.perform(get("/api/v1/game-templates")).andExpect(status().isOk()));
        Map<String, String> categoryOf = new java.util.HashMap<>();
        templates.forEach(t -> categoryOf.put(t.path("code").asText(), t.path("categoryCode").asText()));
        assertThat(categoryOf).containsEntry("GOLDEN_BELL", "QUESTION").containsEntry("BOAT_RACE", "QUESTION")
                .containsEntry("CROSSWORD", "PUZZLE").containsEntry("ORDERING", "PUZZLE").containsEntry("SORTING", "PUZZLE")
                .containsEntry("TEAM_MAKER", "CLASS_TOOL").containsEntry("TIMER", "CLASS_TOOL").containsEntry("DICE", "CLASS_TOOL");
    }

    @Test
    void goldenBellAndBoatRaceTakeQuizItemsWithTheirOwnSettings() throws Exception {
        for (String template : List.of("GOLDEN_BELL", "BOAT_RACE")) {
            String code = createGame(template);
            send(post(itemsPath(code)), items(CHOICE, TRUE_FALSE)).andExpect(status().isCreated())
                    .andExpect(jsonPath("$.items.length()").value(2));
            send(post(itemsPath(code)), items("""
                    {"itemType": "CROSSWORD_ROW", "content": {"clue": "x"}}
                    """)).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_GAME_ITEM"));
            send(post(itemsPath(code)), items("""
                    {"itemType": "SINGLE_CHOICE", "content": {"text": "x", "options": [{"id": "a"}, {"id": "b"}]},
                     "solution": {"correct": ["z"]}}
                    """)).andExpect(status().isBadRequest());
        }
        mockMvc.perform(get(gamePath(createGame("GOLDEN_BELL"))))
                .andExpect(jsonPath("$.settings.timeLimitSec").value(15))
                .andExpect(jsonPath("$.settings.rules.rescue.count").value(1));
        mockMvc.perform(get(gamePath(createGame("BOAT_RACE"))))
                .andExpect(jsonPath("$.settings.rules.win.steps").value(5));
    }

    @Test
    void crosswordRowsKeepTheirKeyLetter() throws Exception {
        String code = createGame("CROSSWORD");
        JsonNode game = body(send(post(itemsPath(code)), items("""
                {"itemType": "CROSSWORD_ROW", "content": {"clue": "Thủ đô của Việt Nam?"},
                 "solution": {"answer": "HÀ NỘI", "keyIndex": 2}}
                """, """
                {"itemType": "CROSSWORD_ROW", "content": {"clue": ""}}
                """)).andExpect(status().isCreated()));
        assertThat(game.path("items").get(0).path("solution").path("keyIndex").asInt()).isEqualTo(2);
        long rowId = game.path("items").get(0).path("id").asLong();

        send(patch(itemPath(code, rowId)), "{\"solution\": {\"answer\": \"HUẾ\", \"keyIndex\": 3}}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("solution.keyIndex must point at a letter of the answer (0-2)"));
        send(patch(itemPath(code, rowId)), "{\"solution\": {\"answer\": \"HUẾ\", \"keyIndex\": 1}}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.items[0].solution.answer").value("HUẾ"));
        send(post(itemsPath(code)), items(CHOICE)).andExpect(status().isBadRequest());
    }

    @Test
    void orderingAndSortingCheckTheirSolutions() throws Exception {
        String ordering = createGame("ORDERING");
        send(post(itemsPath(ordering)), items("""
                {"itemType": "ORDER_SET", "content": {"text": "Từ bé đến lớn", "items": [{"id": "s1", "text": "1"},
                 {"id": "s2", "text": "2"}, {"id": "s3", "text": "3"}]}, "solution": {"order": ["s1", "s2", "s3"]}}
                """)).andExpect(status().isCreated());
        send(post(itemsPath(ordering)), items("""
                {"itemType": "ORDER_SET", "content": {"items": [{"id": "s1"}, {"id": "s2"}]}, "solution": {"order": ["s1"]}}
                """)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("solution.order must list every entry of content.items exactly once"));

        String sorting = createGame("SORTING");
        send(post(itemsPath(sorting)), items("""
                {"itemType": "SORT_SET",
                 "content": {"groups": [{"id": "g1", "text": "Chẵn"}, {"id": "g2", "text": "Lẻ"}],
                             "cards": [{"id": "c1", "text": "2"}, {"id": "c2", "text": "3"}]},
                 "solution": {"assign": [["c1", "g1"], ["c2", "g2"]]}}
                """)).andExpect(status().isCreated())
                .andExpect(jsonPath("$.items[0].solution.assign[1][1]").value("g2"));
        send(post(itemsPath(sorting)), items("""
                {"itemType": "SORT_SET", "content": {"groups": [{"id": "g1"}, {"id": "g2"}], "cards": [{"id": "c1"}]},
                 "solution": {"assign": [["c1", "g3"]]}}
                """)).andExpect(status().isBadRequest());
    }

    @Test
    void toolsHaveNoItems() throws Exception {
        for (String tool : List.of("TEAM_MAKER", "TIMER", "DICE")) {
            String code = createGame(tool);
            send(post(itemsPath(code)), items(CHOICE)).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("INVALID_GAME_ITEM"));
        }
    }

    /** The demo games must stay playable: every seeded item passes the same checks as an item saved in the editor. */
    @Test
    void everyItemOfTheDevSeedIsValid() throws Exception {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT g.code, i.item_type, i.content::text AS content, i.solution::text AS solution,
                       t.config_schema::text AS schema
                FROM game_item i JOIN game_version v ON v.id = i.game_version_id JOIN game g ON g.id = v.game_id
                JOIN game_template t ON t.id = g.template_id
                JOIN users u ON u.id = g.owner_id WHERE u.code = 'u-lan'
                """);
        assertThat(rows).extracting(r -> r.get("code")).contains("g-golden-bell", "g-boat-math", "g-crossword",
                "g-ordering", "g-sorting");
        for (Map<String, Object> row : rows) {
            JsonNode solution = row.get("solution") == null ? null : objectMapper.readTree((String) row.get("solution"));
            assertThatCode(() -> validator.validate(objectMapper.readTree((String) row.get("schema")),
                    (String) row.get("item_type"), objectMapper.readTree((String) row.get("content")), solution))
                    .as("item of %s", row.get("code"))
                    .doesNotThrowAnyException();
        }
    }

    @Test
    void theSeededCrosswordSpellsItsKeyword() throws Exception {
        JsonNode game = body(mockMvc.perform(get(gamePath("g-crossword"))).andExpect(status().isOk()));
        StringBuilder keyword = new StringBuilder();
        for (JsonNode row : game.path("items")) {
            String letters = row.path("solution").path("answer").asText().replaceAll("\\s+", "");
            keyword.appendCodePoint(letters.codePointAt(letters.offsetByCodePoints(0, row.path("solution").path("keyIndex").asInt())));
        }
        assertThat(keyword.toString()).isEqualTo("TRƯỜNG");
    }

    private String createGame(String templateCode) throws Exception {
        return body(send(post("/api/v1/games"), "{\"templateCode\": \"%s\", \"grade\": 3}".formatted(templateCode))
                .andExpect(status().isCreated())).path("code").asText();
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
