package com.edugame.user.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.edugame.auth.mail.AuthMail;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

/**
 * "Cài đặt" against PostgreSQL: the settings document, the defaults new games start with, and the security mails
 * it turns on and off. Each test signs in as a new teacher (Cô Hoa) with real tokens, so the settings, devices and
 * games start empty. Every test is rolled back.
 */
@SpringBootTest(properties = "app.auth.default-user-code=")
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@RecordApplicationEvents
@Transactional
class UserSettingsApiTest {

    private static final String SETTINGS = "/api/v1/me/settings";
    private static final String CHROME_WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            + "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
    private static final String CHROME_WINDOWS_UPDATED = CHROME_WINDOWS.replace("130.0.0.0", "131.0.6778.86");
    private static final String FIREFOX_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:131.0) Gecko/20100101 "
            + "Firefox/131.0";
    private static final String SAFARI_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) "
            + "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ApplicationEvents events;

    /** Rows changed with SQL are read again, not taken from the entities this test already loaded. */
    @PersistenceContext
    private EntityManager entityManager;

    private String hoa;

    @BeforeEach
    void newTeacher() throws Exception {
        jdbcTemplate.update("""
                INSERT INTO users (code, username, password_hash, display_name, email, role)
                VALUES ('u-test-hoa', 'cohoa', ?, 'Cô Hoa', 'cohoa@truong.edu.vn', 'TEACHER')
                """, passwordEncoder.encode("123456"));
        hoa = login("cohoa", CHROME_WINDOWS);
    }

    // --- The document ------------------------------------------------------------------------------------------

    @Test
    void aNewTeacherHasTheDefaults() throws Exception {
        JsonNode settings = body(send(get(SETTINGS), hoa, null).andExpect(status().isOk()));

        assertThat(settings).isEqualTo(objectMapper.readTree("""
                {"display": {"reduceMotion": false, "fullscreenOnStart": false},
                 "games": {},
                 "notifications": {"newSignInEmail": true, "passwordChangedEmail": true},
                 "sound": {"enabled": true, "volume": 80, "music": true}}
                """));
    }

    @Test
    void savedSettingsAreReadBackAndKeptPerTeacher() throws Exception {
        Map<String, Object> mine = settings(true, true, 3, 20, false, true, false, true);
        send(put(SETTINGS), hoa, mine).andExpect(status().isOk())
                .andExpect(jsonPath("$.display.reduceMotion").value(true))
                .andExpect(jsonPath("$.games.teams").value(3))
                .andExpect(jsonPath("$.games.timeLimitSec").value(20))
                .andExpect(jsonPath("$.games.allowSteal").value(false))
                .andExpect(jsonPath("$.games.shuffleItems").value(true))
                .andExpect(jsonPath("$.notifications.newSignInEmail").value(false));

        assertThat(body(send(get(SETTINGS), hoa, null))).isEqualTo(objectMapper.valueToTree(mine));
        // Cô Lan's are her own.
        send(get(SETTINGS), login("colan", CHROME_WINDOWS), null)
                .andExpect(jsonPath("$.display.reduceMotion").value(false));
    }

    @Test
    void aDefaultSetBackToTheGamesOwnIsForgotten() throws Exception {
        send(put(SETTINGS), hoa, settings(false, false, 3, 0, true, null, true, true)).andExpect(status().isOk())
                .andExpect(jsonPath("$.games.timeLimitSec").value(0));
        send(put(SETTINGS), hoa, settings(false, false, null, null, null, null, true, true)).andExpect(status().isOk());

        assertThat(body(send(get(SETTINGS), hoa, null)).path("games").size()).isZero();
        assertThat(jdbcTemplate.queryForObject("SELECT settings -> 'games' FROM users WHERE code = 'u-test-hoa'",
                String.class)).isEqualTo("{}");
    }

    @Test
    void invalidSettingsAreRefusedAndNothingChanges() throws Exception {
        for (Map<String, Object> bad : List.of(
                settings(false, false, 5, null, null, null, true, true),
                settings(false, false, 1, null, null, null, true, true),
                settings(false, false, null, -1, null, null, true, true),
                settings(false, false, null, 601, null, null, true, true),
                settings(null, false, null, null, null, null, true, true),
                settings(false, false, null, null, null, null, true, null))) {
            send(put(SETTINGS), hoa, bad).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        }
        send(put(SETTINGS), hoa, Map.of("display", Map.of("reduceMotion", true, "fullscreenOnStart", true)))
                .andExpect(status().isBadRequest());
        mockMvc.perform(put(SETTINGS).header(HttpHeaders.AUTHORIZATION, "Bearer " + hoa)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"display\": "))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("MALFORMED_REQUEST"));

        send(get(SETTINGS), hoa, null).andExpect(jsonPath("$.display.reduceMotion").value(false));
    }

    @Test
    void soundIsSavedAndAnOlderAppThatLeavesItOutKeepsIt() throws Exception {
        Map<String, Object> quiet = new HashMap<>(settings(false, false, null, null, null, null, true, true));
        quiet.put("sound", Map.of("enabled", true, "volume", 35, "music", false));
        send(put(SETTINGS), hoa, quiet).andExpect(status().isOk())
                .andExpect(jsonPath("$.sound.volume").value(35))
                .andExpect(jsonPath("$.sound.music").value(false));

        // Saved by an app opened before sounds existed: no sound section, the saved one stays.
        Map<String, Object> older = new HashMap<>(settings(true, false, null, null, null, null, true, true));
        older.remove("sound");
        send(put(SETTINGS), hoa, older).andExpect(status().isOk())
                .andExpect(jsonPath("$.display.reduceMotion").value(true))
                .andExpect(jsonPath("$.sound.volume").value(35));

        for (Map<String, Object> bad : List.<Map<String, Object>>of(
                Map.of("enabled", true, "volume", 101, "music", true),
                Map.of("enabled", true, "volume", -1, "music", true),
                Map.of("enabled", true, "music", true))) {
            Map<String, Object> body = new HashMap<>(older);
            body.put("sound", bad);
            send(put(SETTINGS), hoa, body).andExpect(status().isBadRequest());
        }
        send(get(SETTINGS), hoa, null).andExpect(jsonPath("$.sound.volume").value(35));
    }

    @Test
    void unknownKeysAreIgnored() throws Exception {
        Map<String, Object> withExtra = new HashMap<>(settings(true, false, null, null, null, null, true, true));
        withExtra.put("theme", "dark");
        send(put(SETTINGS), hoa, withExtra).andExpect(status().isOk());

        assertThat(jdbcTemplate.queryForObject("SELECT settings ? 'theme' FROM users WHERE code = 'u-test-hoa'",
                Boolean.class)).isFalse();
    }

    @Test
    void storedSettingsMissingKeysOrUnreadableFallBackToTheDefaults() throws Exception {
        // Saved by an older version: one key only.
        jdbcTemplate.update("UPDATE users SET settings = '{\"display\": {\"reduceMotion\": true}}' WHERE code = 'u-test-hoa'");
        entityManager.clear();
        send(get(SETTINGS), hoa, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.display.reduceMotion").value(true))
                .andExpect(jsonPath("$.display.fullscreenOnStart").value(false))
                .andExpect(jsonPath("$.notifications.newSignInEmail").value(true));

        // A value that no longer reads: the defaults rather than an error page.
        jdbcTemplate.update("UPDATE users SET settings = '{\"games\": {\"teams\": \"nhiều\"}, \"display\": 3}' "
                + "WHERE code = 'u-test-hoa'");
        entityManager.clear();
        send(get(SETTINGS), hoa, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.display.reduceMotion").value(false))
                .andExpect(jsonPath("$.games.teams").doesNotExist());
    }

    @Test
    void settingsNeedASignedInTeacher() throws Exception {
        mockMvc.perform(get(SETTINGS)).andExpect(status().isUnauthorized());
        mockMvc.perform(put(SETTINGS).contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(settings(true, true, null, null, null, null, true, true))))
                .andExpect(status().isUnauthorized());
    }

    // --- Defaults of new games ---------------------------------------------------------------------------------

    @Test
    void newGamesStartWithTheTeachersDefaultsWhereTheyHaveTheRule() throws Exception {
        send(put(SETTINGS), hoa, settings(false, false, 3, 45, false, true, true, true)).andExpect(status().isOk());

        JsonNode quiz = newGame("QUIZ");
        assertThat(quiz.at("/rules/participants/teams").asInt()).isEqualTo(3);
        assertThat(quiz.path("timeLimitSec").asInt()).isEqualTo(45);
        assertThat(quiz.at("/rules/scoring/allowSteal").asBoolean()).isFalse();
        assertThat(quiz.path("shuffleItems").asBoolean()).isTrue();
        assertThat(quiz.path("shuffleOptions").asBoolean()).as("not a teacher default").isTrue();

        // Lật ô: teams are set by hand, no time, no steal, no shuffle; nothing is added.
        JsonNode grid = newGame("GRID_BOARD");
        assertThat(grid.at("/rules/participants/teams").asInt()).isEqualTo(4);
        assertThat(grid.has("timeLimitSec")).isFalse();
        assertThat(grid.has("shuffleItems")).isFalse();

        // Rung chuông vàng: played alone, so only the time changes.
        JsonNode bell = newGame("GOLDEN_BELL");
        assertThat(bell.path("timeLimitSec").asInt()).isEqualTo(45);
        assertThat(bell.at("/rules/participants/teams").isMissingNode()).isTrue();

        // Lật thẻ: teams, but no steal rule to change.
        JsonNode memory = newGame("MEMORY");
        assertThat(memory.at("/rules/participants/teams").asInt()).isEqualTo(3);
        assertThat(memory.at("/rules/scoring/allowSteal").isMissingNode()).isTrue();

        // Tools keep their own settings.
        assertThat(newGame("TIMER").path("seconds").asInt()).isEqualTo(300);
    }

    @Test
    void withoutDefaultsNewGamesKeepTheTemplatesAndOldGamesNeverChange() throws Exception {
        JsonNode before = newGameResponse("QUIZ");
        assertThat(before.at("/settings/rules/participants/teams").asInt()).isEqualTo(4);
        assertThat(before.at("/settings/timeLimitSec").asInt()).isEqualTo(30);

        send(put(SETTINGS), hoa, settings(false, false, 2, 10, null, null, true, true)).andExpect(status().isOk());

        send(get("/api/v1/games/" + before.path("code").asText()), hoa, null)
                .andExpect(jsonPath("$.settings.rules.participants.teams").value(4))
                .andExpect(jsonPath("$.settings.timeLimitSec").value(30));
    }

    @Test
    void aGameMadeFromAQuestionSetGetsTheDefaultsToo() throws Exception {
        send(put(SETTINGS), hoa, settings(false, false, 2, 60, null, null, true, true)).andExpect(status().isOk());
        String set = body(send(post("/api/v1/question-sets"), hoa, Map.of("title", "Bộ của cô Hoa", "subject", "TOAN")))
                .at("/summary/code").asText();
        send(post("/api/v1/question-sets/" + set + "/questions"), hoa, Map.of("questions", List.of(Map.of(
                "type", "MULTIPLE_CHOICE", "text", "1 + 1 = ?", "options", List.of("2", "3"), "correctOption", 0))))
                .andExpect(status().isCreated());

        String game = body(send(post("/api/v1/question-sets/" + set + "/games"), hoa, Map.of("templateCode", "QUIZ"))
                .andExpect(status().isCreated())).path("gameCode").asText();

        send(get("/api/v1/games/" + game), hoa, null)
                .andExpect(jsonPath("$.settings.rules.participants.teams").value(2))
                .andExpect(jsonPath("$.settings.timeLimitSec").value(60));
    }

    // --- Notification mails ------------------------------------------------------------------------------------

    @Test
    void aSignInOnANewBrowserIsMailedButNotTheSameBrowserUpdated() throws Exception {
        login("cohoa", CHROME_WINDOWS);
        login("cohoa", CHROME_WINDOWS_UPDATED);
        assertThat(events.stream(AuthMail.NewSignIn.class)).isEmpty();

        login("cohoa", FIREFOX_MAC);

        assertThat(events.stream(AuthMail.NewSignIn.class).toList()).singleElement().satisfies(mail -> {
            assertThat(mail.email()).isEqualTo("cohoa@truong.edu.vn");
            assertThat(mail.device()).isEqualTo("Firefox trên macOS");
        });
        // Known from now on.
        login("cohoa", FIREFOX_MAC);
        assertThat(events.stream(AuthMail.NewSignIn.class)).hasSize(1);
    }

    @Test
    void aDeviceStaysKnownAfterItsSessionsAreDeleted() throws Exception {
        login("cohoa", FIREFOX_MAC);
        assertThat(events.stream(AuthMail.NewSignIn.class)).hasSize(1);

        // Ended sessions are deleted after a week; a classroom computer used once a week must not alert each time.
        jdbcTemplate.update("DELETE FROM user_session WHERE user_id = (SELECT id FROM users WHERE code = 'u-test-hoa')");
        login("cohoa", FIREFOX_MAC);
        login("cohoa", CHROME_WINDOWS);

        assertThat(events.stream(AuthMail.NewSignIn.class)).hasSize(1);
        assertThat(jdbcTemplate.queryForList("""
                SELECT device FROM user_known_device WHERE user_id = (SELECT id FROM users WHERE code = 'u-test-hoa')
                ORDER BY device
                """, String.class)).containsExactly("Chrome trên Windows", "Firefox trên macOS");
    }

    @Test
    void theNewSignInMailCanBeTurnedOff() throws Exception {
        send(put(SETTINGS), hoa, settings(false, false, null, null, null, null, false, true)).andExpect(status().isOk());

        login("cohoa", SAFARI_IPHONE);
        // No browser named (an API client): never an alert.
        login("cohoa", null);

        assertThat(events.stream(AuthMail.NewSignIn.class)).isEmpty();
    }

    @Test
    void aFirstSignInHasNothingToCompareWith() throws Exception {
        // The sign-in of @BeforeEach was Cô Hoa's first: no mail for it.
        assertThat(events.stream(AuthMail.NewSignIn.class)).isEmpty();
    }

    @Test
    void aChangedPasswordIsMailedUnlessTurnedOff() throws Exception {
        changePassword("123456", "matkhau-moi-2026").andExpect(status().isOk());
        assertThat(events.stream(AuthMail.PasswordChanged.class).toList()).singleElement()
                .satisfies(mail -> assertThat(mail.email()).isEqualTo("cohoa@truong.edu.vn"));

        // A wrong current password changes nothing and mails nothing.
        changePassword("sai-roi", "matkhau-khac-2026").andExpect(status().isBadRequest());
        assertThat(events.stream(AuthMail.PasswordChanged.class)).hasSize(1);

        send(put(SETTINGS), hoa, settings(false, false, null, null, null, null, true, false)).andExpect(status().isOk());
        changePassword("matkhau-moi-2026", "matkhau-ba-2026").andExpect(status().isOk());
        assertThat(events.stream(AuthMail.PasswordChanged.class)).hasSize(1);
    }

    // --- Helpers ----------------------------------------------------------------------------------------------

    private static Map<String, Object> settings(Boolean reduceMotion, Boolean fullscreen, Integer teams, Integer time,
                                                Boolean steal, Boolean shuffle, Boolean signInMail,
                                                Boolean passwordMail) {
        Map<String, Object> display = new HashMap<>();
        display.put("reduceMotion", reduceMotion);
        display.put("fullscreenOnStart", fullscreen);
        Map<String, Object> games = new HashMap<>();
        if (teams != null) {
            games.put("teams", teams);
        }
        if (time != null) {
            games.put("timeLimitSec", time);
        }
        if (steal != null) {
            games.put("allowSteal", steal);
        }
        if (shuffle != null) {
            games.put("shuffleItems", shuffle);
        }
        Map<String, Object> notifications = new HashMap<>();
        notifications.put("newSignInEmail", signInMail);
        notifications.put("passwordChangedEmail", passwordMail);
        return Map.of("display", display, "games", games, "notifications", notifications,
                "sound", Map.of("enabled", true, "volume", 80, "music", true));
    }

    private JsonNode newGame(String template) throws Exception {
        return newGameResponse(template).path("settings");
    }

    private JsonNode newGameResponse(String template) throws Exception {
        return body(send(post("/api/v1/games"), hoa, Map.of("templateCode", template, "grade", 3))
                .andExpect(status().isCreated()));
    }

    private ResultActions changePassword(String current, String next) throws Exception {
        return send(post("/api/v1/me/password"), hoa, Map.of("currentPassword", current, "newPassword", next));
    }

    private String login(String username, String userAgent) throws Exception {
        var request = post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("username", username, "password", "123456")));
        if (userAgent != null) {
            request.header(HttpHeaders.USER_AGENT, userAgent);
        }
        return body(mockMvc.perform(request).andExpect(status().isOk())).path("accessToken").asText();
    }

    private ResultActions send(MockHttpServletRequestBuilder request, String token, Object body) throws Exception {
        request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token);
        if (body != null) {
            request.contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(body));
        }
        return mockMvc.perform(request);
    }

    private JsonNode body(ResultActions result) throws Exception {
        return objectMapper.readTree(result.andReturn().getResponse().getContentAsString());
    }
}
