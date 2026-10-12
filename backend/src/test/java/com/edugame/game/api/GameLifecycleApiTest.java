package com.edugame.game.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import com.edugame.auth.service.AccessTokenService;
import com.edugame.auth.service.UserSessionService;
import com.edugame.user.domain.UserRole;
import com.edugame.user.domain.UserStatus;
import com.edugame.user.dto.UserAccount;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

/**
 * A game's life in the library, end to end against PostgreSQL: create from a template, edit details and settings,
 * publish, open a new draft, archive, the item limits, and that a teacher only ever sees their own games. Requests
 * without a token act as Cô Lan (dev profile); every test is rolled back.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@Transactional
class GameLifecycleApiTest {

    private static final String GAMES = "/api/v1/games";

    private static final String QUIZ_ITEM = """
            {"itemType": "SINGLE_CHOICE",
             "content": {"text": "%s", "options": [{"id": "a", "text": "1"}, {"id": "b", "text": "2"}]},
             "solution": {"correct": ["a"]}}
            """;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private AccessTokenService accessTokenService;

    @Autowired
    private UserSessionService userSessionService;

    @Test
    void newGameIsADraftWithTheTemplateSettings() throws Exception {
        JsonNode game = body(send(post(GAMES), "{\"templateCode\": \"QUIZ\", \"grade\": 3}").andExpect(status().isCreated()));
        String code = game.path("code").asText();

        assertThat(code).matches("g-[a-z0-9]{10}");
        assertThat(game.path("title").asText()).endsWith(" mới");
        assertThat(game.path("status").asText()).isEqualTo("DRAFT");
        assertThat(game.path("version").asInt()).isEqualTo(1);
        assertThat(game.path("versionStatus").asText()).isEqualTo("DRAFT");
        assertThat(game.path("items")).isEmpty();
        JsonNode templateConfig = objectMapper.readTree(jdbcTemplate.queryForObject(
                "SELECT default_config::text FROM game_template WHERE code = 'QUIZ'", String.class));
        assertThat(game.path("settings")).isEqualTo(templateConfig);

        // The newest game comes first in the library.
        mockMvc.perform(get(GAMES)).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].code").value(code))
                .andExpect(jsonPath("$[0].itemCount").value(0));
    }

    @Test
    void createRejectsBadInput() throws Exception {
        send(post(GAMES), "{\"templateCode\": \"NOPE\"}").andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
        send(post(GAMES), "{\"templateCode\": \"QUIZ\", \"grade\": 9}").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_GRADE"));
        send(post(GAMES), "{\"templateCode\": \"QUIZ\", \"title\": \"   \"}").andExpect(status().isBadRequest());
        send(post(GAMES), "{}").andExpect(status().isBadRequest());
        send(post(GAMES), "{\"templateCode\": \"QUIZ\", \"title\": \"  Ôn tập  \"}").andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Ôn tập"));
    }

    @Test
    void detailsAreUpdatedOnlyWhereGiven() throws Exception {
        String code = createGame("MATCHING");
        send(patch(gamePath(code)), "{\"title\": \" Thủ đô \", \"subject\": \"Địa lí\", \"description\": \"Nối tên\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Thủ đô"))
                .andExpect(jsonPath("$.subject").value("Địa lí"));

        // Null fields stay; a blank description / subject clears it.
        send(patch(gamePath(code)), "{\"description\": \"  \", \"subject\": \"\"}").andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Thủ đô"))
                .andExpect(jsonPath("$.description").doesNotExist())
                .andExpect(jsonPath("$.subject").doesNotExist());

        send(patch(gamePath(code)), "{\"grade\": 0}").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_GRADE"));
        send(patch(gamePath(code)), "{\"settings\": [1, 2]}").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_SETTINGS"));
        send(patch(gamePath(code)), "{\"settings\": {\"timeLimitSec\": 30}}").andExpect(status().isOk())
                .andExpect(jsonPath("$.settings.timeLimitSec").value(30));
    }

    @Test
    void publishFreezesTheDraftAndEditingOpensANewOne() throws Exception {
        String code = createGame("QUIZ");
        long itemId = body(send(post(itemsPath(code)), items(quiz("1 + 0 = ?")))).path("items").get(0).path("id").asLong();

        mockMvc.perform(post(gamePath(code) + "/publish")).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"))
                .andExpect(jsonPath("$.version").value(1))
                .andExpect(jsonPath("$.versionStatus").value("PUBLISHED"));
        mockMvc.perform(post(gamePath(code) + "/publish")).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("NOTHING_TO_PUBLISH"));

        // Opening the editor makes version 2 with copies of the items; opening it again reuses that draft.
        JsonNode draft = body(mockMvc.perform(post(gamePath(code) + "/draft")).andExpect(status().isOk()));
        assertThat(draft.path("version").asInt()).isEqualTo(2);
        assertThat(draft.path("versionStatus").asText()).isEqualTo("DRAFT");
        long copyId = draft.path("items").get(0).path("id").asLong();
        assertThat(copyId).isNotEqualTo(itemId);
        mockMvc.perform(post(gamePath(code) + "/draft"))
                .andExpect(jsonPath("$.version").value(2))
                .andExpect(jsonPath("$.items[0].id").value(copyId));

        // Changes go to the draft only; version 1 keeps what was played.
        send(patch(itemPath(code, copyId)), "{\"content\": {\"text\": \"2 + 0 = ?\", \"options\": "
                + "[{\"id\": \"a\", \"text\": \"2\"}, {\"id\": \"b\", \"text\": \"3\"}]}}").andExpect(status().isOk());
        assertThat(jdbcTemplate.queryForObject("""
                SELECT i.content ->> 'text' FROM game_item i JOIN game_version v ON v.id = i.game_version_id
                JOIN game g ON g.id = v.game_id WHERE g.code = ? AND v.version = 1
                """, String.class, code)).isEqualTo("1 + 0 = ?");

        mockMvc.perform(post(gamePath(code) + "/publish")).andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(2))
                .andExpect(jsonPath("$.items[0].content.text").value("2 + 0 = ?"));
    }

    @Test
    void changingSettingsOfAPublishedGameMakesADraft() throws Exception {
        String code = createGame("MEMORY");
        mockMvc.perform(post(gamePath(code) + "/publish")).andExpect(status().isOk());

        // Renaming is not part of a version: no draft.
        send(patch(gamePath(code)), "{\"title\": \"Con vật\"}").andExpect(jsonPath("$.versionStatus").value("PUBLISHED"));
        send(patch(gamePath(code)), "{\"settings\": {\"flipBackDelayMs\": 1500}}")
                .andExpect(jsonPath("$.version").value(2))
                .andExpect(jsonPath("$.versionStatus").value("DRAFT"))
                .andExpect(jsonPath("$.settings.flipBackDelayMs").value(1500));
    }

    @Test
    void archivedGamesDisappear() throws Exception {
        String code = createGame("QUIZ");
        mockMvc.perform(delete(gamePath(code))).andExpect(status().isNoContent());

        mockMvc.perform(get(gamePath(code))).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
        mockMvc.perform(post(gamePath(code) + "/publish")).andExpect(status().isNotFound());
        mockMvc.perform(delete(gamePath(code))).andExpect(status().isNotFound());
        send(post(itemsPath(code)), items(quiz("x"))).andExpect(status().isNotFound());
        assertThat(codesInLibrary(null)).doesNotContain(code);
    }

    @Test
    void aGameHoldsAtMost200Items() throws Exception {
        String code = createGame("QUIZ");
        List<String> batch = new ArrayList<>(Collections.nCopies(150, quiz("Câu hỏi")));
        send(post(itemsPath(code)), items(batch.toArray(String[]::new))).andExpect(status().isCreated());

        send(post(itemsPath(code)), items(batch.subList(0, 51).toArray(String[]::new))).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("TOO_MANY_ITEMS"));
        send(post(itemsPath(code)), items(batch.subList(0, 50).toArray(String[]::new))).andExpect(status().isCreated())
                .andExpect(jsonPath("$.items.length()").value(200))
                .andExpect(jsonPath("$.items[199].position").value(199));
        send(post(itemsPath(code)), items(quiz("Câu 201"))).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("TOO_MANY_ITEMS"));
        mockMvc.perform(get(GAMES)).andExpect(jsonPath("$[0].itemCount").value(200));
    }

    @Test
    void reorderMustListEveryItemOnce() throws Exception {
        String code = createGame("QUIZ");
        JsonNode game = body(send(post(itemsPath(code)), items(quiz("A"), quiz("B"), quiz("C"))));
        long a = game.path("items").get(0).path("id").asLong();
        long b = game.path("items").get(1).path("id").asLong();
        long c = game.path("items").get(2).path("id").asLong();
        long elsewhere = body(send(post(itemsPath(createGame("QUIZ"))), items(quiz("D"))))
                .path("items").get(0).path("id").asLong();

        reorder(code, a, b).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_ITEM_ORDER"));
        reorder(code, a, b, b, c).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_ITEM_ORDER"));
        reorder(code, a, b, elsewhere).andExpect(status().isNotFound());
        send(put(itemsPath(code) + "/order"), "{\"itemIds\": []}").andExpect(status().isBadRequest());

        reorder(code, c, a, b).andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].content.text").value("C"))
                .andExpect(jsonPath("$.items[2].content.text").value("B"))
                .andExpect(jsonPath("$.items[2].position").value(2));

        // Deleting from the middle closes the gap.
        mockMvc.perform(delete(itemPath(code, a))).andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].content.text").value("C"))
                .andExpect(jsonPath("$.items[1].content.text").value("B"))
                .andExpect(jsonPath("$.items[1].position").value(1));
        mockMvc.perform(delete(itemPath(code, a))).andExpect(status().isNotFound());
    }

    @Test
    void anotherTeacherCannotSeeOrChangeTheGame() throws Exception {
        String code = createGame("QUIZ");
        long itemId = body(send(post(itemsPath(code)), items(quiz("Của cô Lan")))).path("items").get(0).path("id").asLong();
        String other = otherTeacher();

        // Their library is empty, and every game of Cô Lan answers 404 as if it did not exist.
        assertThat(codesInLibrary(other)).isEmpty();
        for (String seeded : List.of(code, "g-addition", "g-quiz-vn")) {
            mockMvc.perform(get(gamePath(seeded)).header(HttpHeaders.AUTHORIZATION, other)).andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
        }
        send(patch(gamePath(code)).header(HttpHeaders.AUTHORIZATION, other), "{\"title\": \"Của tôi\"}")
                .andExpect(status().isNotFound());
        mockMvc.perform(post(gamePath(code) + "/publish").header(HttpHeaders.AUTHORIZATION, other))
                .andExpect(status().isNotFound());
        mockMvc.perform(post(gamePath(code) + "/draft").header(HttpHeaders.AUTHORIZATION, other))
                .andExpect(status().isNotFound());
        mockMvc.perform(delete(gamePath(code)).header(HttpHeaders.AUTHORIZATION, other)).andExpect(status().isNotFound());
        send(post(itemsPath(code)).header(HttpHeaders.AUTHORIZATION, other), items(quiz("x"))).andExpect(status().isNotFound());
        send(patch(itemPath(code, itemId)).header(HttpHeaders.AUTHORIZATION, other), "{\"solution\": null}")
                .andExpect(status().isNotFound());
        mockMvc.perform(delete(itemPath(code, itemId)).header(HttpHeaders.AUTHORIZATION, other))
                .andExpect(status().isNotFound());

        // Nothing changed for Cô Lan.
        mockMvc.perform(get(gamePath(code))).andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Trắc nghiệm mới"))
                .andExpect(jsonPath("$.versionStatus").value("DRAFT"))
                .andExpect(jsonPath("$.items[0].solution.correct[0]").value("a"));

        // The other teacher's own game is theirs alone.
        String theirs = body(send(post(GAMES).header(HttpHeaders.AUTHORIZATION, other), "{\"templateCode\": \"MEMORY\"}")
                .andExpect(status().isCreated())).path("code").asText();
        assertThat(codesInLibrary(other)).containsExactly(theirs);
        assertThat(codesInLibrary(null)).doesNotContain(theirs);
        mockMvc.perform(get(gamePath(theirs))).andExpect(status().isNotFound());
    }

    @Test
    void theLibraryNeedsASignIn() throws Exception {
        mockMvc.perform(get(GAMES).header(HttpHeaders.AUTHORIZATION, "Bearer not-a-token"))
                .andExpect(status().isUnauthorized());
    }

    /** A second teacher, signed in; returns the Authorization header value. */
    private String otherTeacher() {
        Long id = jdbcTemplate.queryForObject("""
                INSERT INTO users (code, username, password_hash, display_name, email, role)
                VALUES ('u-test-hoa', 'cohoa', '{noop}123456', 'Cô Hoa', 'cohoa@edugame.local', 'TEACHER')
                RETURNING id
                """, Long.class);
        UserAccount account = new UserAccount(id, "u-test-hoa", "cohoa", null, UserRole.TEACHER, UserStatus.ACTIVE);
        UUID sid = userSessionService.open(account, false, "test").sid();
        return "Bearer " + accessTokenService.issue(account, sid).accessToken();
    }

    private List<String> codesInLibrary(String authorization) throws Exception {
        MockHttpServletRequestBuilder request = get(GAMES);
        if (authorization != null) {
            request.header(HttpHeaders.AUTHORIZATION, authorization);
        }
        List<String> codes = new ArrayList<>();
        body(mockMvc.perform(request).andExpect(status().isOk())).forEach(game -> codes.add(game.path("code").asText()));
        return codes;
    }

    private String createGame(String templateCode) throws Exception {
        return body(send(post(GAMES), "{\"templateCode\": \"%s\", \"grade\": 3}".formatted(templateCode))
                .andExpect(status().isCreated())).path("code").asText();
    }

    private ResultActions reorder(String code, long... itemIds) throws Exception {
        return send(put(itemsPath(code) + "/order"), objectMapper.writeValueAsString(
                java.util.Map.of("itemIds", itemIds)));
    }

    private ResultActions send(MockHttpServletRequestBuilder request, String json) throws Exception {
        return mockMvc.perform(request.contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private JsonNode body(ResultActions result) throws Exception {
        return objectMapper.readTree(result.andReturn().getResponse().getContentAsString());
    }

    private static String quiz(String text) {
        return QUIZ_ITEM.formatted(text);
    }

    private static String items(String... items) {
        return "{\"items\": [" + String.join(",", items) + "]}";
    }

    private static String gamePath(String code) {
        return GAMES + "/" + code;
    }

    private static String itemsPath(String code) {
        return gamePath(code) + "/items";
    }

    private static String itemPath(String code, long itemId) {
        return itemsPath(code) + "/" + itemId;
    }
}
