package com.edugame.game.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
 * The question games added by V17 and V19 (and the tools of V18), end to end against PostgreSQL: the catalog lists them as question games, they take
 * the quiz items (and only those), start with their own rules, and question sets play them.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@Transactional
class MoreQuizGamesApiTest {

    private static final List<String> GAMES = List.of("MILLIONAIRE", "TUG_OF_WAR", "FLOWER_PICK", "WHACK_MOLE",
            "TRUE_FALSE", "LUCKY_STAR", "SECRET_PICTURE", "MOUNTAIN_CLIMB", "POINT_WHEEL", "TIC_TAC_TOE", "CONNECT_FOUR",
            "TREASURE_CHEST", "BUILD_TOWER", "BEE_FLOWER", "BINGO");

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

    @Test
    void theCatalogListsThemAsQuestionGames() throws Exception {
        JsonNode templates = body(mockMvc.perform(get("/api/v1/game-templates")).andExpect(status().isOk()));
        Map<String, JsonNode> byCode = new HashMap<>();
        templates.forEach(t -> byCode.put(t.path("code").asText(), t));
        for (String code : GAMES) {
            assertThat(byCode).as(code).containsKey(code);
            assertThat(byCode.get(code).path("categoryCode").asText()).as(code).isEqualTo("QUESTION");
            assertThat(byCode.get(code).path("name").asText()).as(code).isNotBlank();
        }
    }

    @Test
    void theCatalogListsTheNewClassTools() throws Exception {
        JsonNode templates = body(mockMvc.perform(get("/api/v1/game-templates")).andExpect(status().isOk()));
        Map<String, String> categoryOf = new HashMap<>();
        templates.forEach(t -> categoryOf.put(t.path("code").asText(), t.path("categoryCode").asText()));
        for (String code : List.of("COIN_FLIP", "RANDOM_NUMBER", "SCOREBOARD", "NOISE_METER", "TRAFFIC_LIGHT")) {
            assertThat(categoryOf).as(code).containsEntry(code, "CLASS_TOOL");
        }
        // Tools have no sample content.
        send(post("/api/v1/games/samples"), "{\"templateCode\": \"COIN_FLIP\"}").andExpect(status().isBadRequest());
    }

    @Test
    void theyTakeQuizItemsOnly() throws Exception {
        for (String template : GAMES) {
            String code = createGame(template);
            send(post(itemsPath(code)), items(CHOICE, TRUE_FALSE)).andExpect(status().isCreated())
                    .andExpect(jsonPath("$.items.length()").value(2));
            send(post(itemsPath(code)), items("""
                    {"itemType": "PAIR_SET", "content": {"pairs": []}}
                    """)).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_GAME_ITEM"));
        }
    }

    @Test
    void eachStartsWithItsOwnRules() throws Exception {
        mockMvc.perform(get(gamePath(createGame("MILLIONAIRE"))))
                .andExpect(jsonPath("$.settings.rules.participants.mode").value("INDIVIDUAL"))
                .andExpect(jsonPath("$.settings.rules.lifelines.length()").value(3));
        mockMvc.perform(get(gamePath(createGame("TUG_OF_WAR"))))
                .andExpect(jsonPath("$.settings.rules.participants.teams").value(2))
                .andExpect(jsonPath("$.settings.rules.win.steps").value(4));
        mockMvc.perform(get(gamePath(createGame("LUCKY_STAR"))))
                .andExpect(jsonPath("$.settings.rules.scoring.luckyStars").value(3));
        mockMvc.perform(get(gamePath(createGame("SECRET_PICTURE"))))
                .andExpect(jsonPath("$.settings.rules.scoring.keywordPoints").value(40));
        mockMvc.perform(get(gamePath(createGame("MOUNTAIN_CLIMB"))))
                .andExpect(jsonPath("$.settings.rules.win.steps").value(5));
    }

    @Test
    void aQuestionSetPlaysThem() throws Exception {
        for (String template : List.of("MILLIONAIRE", "TRUE_FALSE", "POINT_WHEEL", "TIC_TAC_TOE", "BINGO")) {
            JsonNode used = body(send(post("/api/v1/question-sets/qs-toan2-cong100/games"),
                    "{\"templateCode\": \"%s\"}".formatted(template)).andExpect(status().isCreated()));
            assertThat(used.path("templateCode").asText()).isEqualTo(template);
            assertThat(used.path("questionCount").asInt()).as(template).isPositive();
        }
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
}
