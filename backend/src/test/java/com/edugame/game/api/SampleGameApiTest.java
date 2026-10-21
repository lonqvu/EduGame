package com.edugame.game.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

import com.edugame.auth.service.AccessTokenService;
import com.edugame.auth.service.UserSessionService;
import com.edugame.user.domain.UserRole;
import com.edugame.user.domain.UserStatus;
import com.edugame.user.dto.UserAccount;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

/**
 * "Chơi ngay" against PostgreSQL: each question game type plays its sample content at once, made into one game of
 * the teacher's the first time. A new teacher (Cô Hoa) signs in with a real token, so she starts with no games.
 * Every test is rolled back.
 */
@SpringBootTest(properties = "app.auth.default-user-code=")
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@Transactional
class SampleGameApiTest {

    private static final String SAMPLES = "/api/v1/games/samples";
    private static final List<String> QUESTION_GAMES = List.of("QUIZ", "GOLDEN_BELL", "BOAT_RACE", "GRID_BOARD",
            "MATCHING", "MEMORY", "CROSSWORD", "ORDERING", "SORTING");

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

    private String hoa;

    @BeforeEach
    void signIn() {
        jdbcTemplate.update("""
                INSERT INTO users (code, username, password_hash, display_name, email, role)
                VALUES ('u-test-hoa', 'cohoa', 'x', 'Cô Hoa', 'cohoa@truong.edu.vn', 'TEACHER')
                """);
        Long id = jdbcTemplate.queryForObject("SELECT id FROM users WHERE code = 'u-test-hoa'", Long.class);
        UserAccount account = new UserAccount(id, "u-test-hoa", "cohoa", null, UserRole.TEACHER, UserStatus.ACTIVE);
        UUID sid = userSessionService.open(account, false, "test").sid();
        hoa = "Bearer " + accessTokenService.issue(account, sid).accessToken();
    }

    @Test
    void everyQuestionGameHasSampleContentThatIsValid() throws Exception {
        JsonNode file;
        try (InputStream in = new ClassPathResource("samples/sample-games.json").getInputStream()) {
            file = objectMapper.readTree(in);
        }
        assertThat(file.properties()).extracting(e -> e.getKey()).containsExactlyInAnyOrderElementsOf(QUESTION_GAMES);

        for (String type : QUESTION_GAMES) {
            JsonNode game = body(play(type).andExpect(status().isOk()));
            assertThat(game.get("templateCode").asText()).isEqualTo(type);
            assertThat(game.get("sample").asBoolean()).as(type).isTrue();
            assertThat(game.get("title").asText()).isEqualTo(file.at("/" + type + "/title").asText());
            assertThat(game.get("items")).as(type).hasSize(file.at("/" + type + "/items").size());
            // The template's settings, as for any new game.
            assertThat(game.get("settings").isObject()).isTrue();
        }
    }

    @Test
    void theSampleGameIsMadeOnceThenPlayedAgain() throws Exception {
        String first = body(play("QUIZ")).get("code").asText();
        String again = body(play("QUIZ")).get("code").asText();
        assertThat(again).isEqualTo(first);
        assertThat(jdbcTemplate.queryForObject("""
                SELECT count(*) FROM game g JOIN users u ON u.id = g.owner_id WHERE u.code = 'u-test-hoa' AND g.sample
                """, Long.class)).isEqualTo(1);

        // In the library, marked as a sample.
        JsonNode library = body(mockMvc.perform(get("/api/v1/games").header(HttpHeaders.AUTHORIZATION, hoa)));
        assertThat(library).hasSize(1);
        assertThat(library.get(0).get("sample").asBoolean()).isTrue();

        // Another type is another game.
        assertThat(body(play("GOLDEN_BELL")).get("code").asText()).isNotEqualTo(first);
    }

    @Test
    void anArchivedSampleIsMadeAgainFresh() throws Exception {
        String first = body(play("MEMORY")).get("code").asText();
        mockMvc.perform(delete("/api/v1/games/" + first).header(HttpHeaders.AUTHORIZATION, hoa))
                .andExpect(status().isNoContent());

        JsonNode fresh = body(play("MEMORY").andExpect(status().isOk()));
        assertThat(fresh.get("code").asText()).isNotEqualTo(first);
        assertThat(fresh.get("items")).hasSize(1);
    }

    @Test
    void toolsAndUnknownTypesHaveNoSample() throws Exception {
        for (String type : List.of("SPIN_WHEEL", "TIMER", "NAME_RACE", "NOPE")) {
            play(type).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("NO_SAMPLE"));
        }
        mockMvc.perform(post(SAMPLES).header(HttpHeaders.AUTHORIZATION, hoa).contentType(MediaType.APPLICATION_JSON)
                .content("{}")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        mockMvc.perform(post(SAMPLES).contentType(MediaType.APPLICATION_JSON).content("{\"templateCode\":\"QUIZ\"}"))
                .andExpect(status().isUnauthorized());
    }

    private ResultActions play(String templateCode) throws Exception {
        return mockMvc.perform(post(SAMPLES).header(HttpHeaders.AUTHORIZATION, hoa)
                .contentType(MediaType.APPLICATION_JSON).content("{\"templateCode\":\"%s\"}".formatted(templateCode)));
    }

    private JsonNode body(ResultActions result) throws Exception {
        return objectMapper.readTree(result.andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8));
    }
}
