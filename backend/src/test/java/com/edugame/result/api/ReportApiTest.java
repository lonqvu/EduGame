package com.edugame.result.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.edugame.auth.service.AccessTokenService;
import com.edugame.auth.service.UserSessionService;
import com.edugame.user.domain.UserRole;
import com.edugame.user.domain.UserStatus;
import com.edugame.user.dto.UserAccount;
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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

/**
 * "Báo cáo" against PostgreSQL. Each test makes its own class (3A Báo cáo, three students) and plays Cô Lan's seeded
 * games with it, moving the times with SQL, so the figures are exact. Days are in the school's time zone
 * (Asia/Ho_Chi_Minh). Every test is rolled back.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@Transactional
class ReportApiTest {

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final String CLASSES = "/api/v1/classrooms";

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

    @PersistenceContext
    private EntityManager entityManager;

    private String classroom;
    private List<Long> students;
    private LocalDate today;

    @BeforeEach
    void newClass() throws Exception {
        classroom = body(send(post(CLASSES), Map.of("name", "3A Báo cáo", "grade", 3)).andExpect(status().isCreated()))
                .path("code").asText();
        JsonNode added = body(send(post(CLASSES + "/" + classroom + "/students"), Map.of("students", List.of(
                Map.of("displayName", "An"), Map.of("displayName", "Bình"), Map.of("displayName", "Chi")))));
        students = List.of(added.get(0).path("id").asLong(), added.get(1).path("id").asLong(),
                added.get(2).path("id").asLong());
        today = LocalDate.now(ZONE);
    }

    // --- The report --------------------------------------------------------------------------------------------

    @Test
    void aClassThatHasNotPlayedYetHasAnEmptyReportOfTheLast30Days() throws Exception {
        JsonNode report = report("");

        assertThat(report.path("classroom").path("name").asText()).isEqualTo("3A Báo cáo");
        assertThat(report.path("classroom").path("studentCount").asLong()).isEqualTo(3);
        assertThat(report.path("to").asText()).isEqualTo(today.toString());
        assertThat(report.path("from").asText()).isEqualTo(today.minusDays(29).toString());
        assertThat(report.path("summary")).isEqualTo(objectMapper.readTree("""
                {"activities": 0, "completed": 0, "playMinutes": 0, "stars": 0, "correctAnswers": 0, "games": 0}
                """));
        assertThat(report.path("daily")).hasSize(30);
        assertThat(report.path("daily").findValues("activities")).allMatch(v -> v.asLong() == 0);
        assertThat(report.path("byTemplate")).isEmpty();
        assertThat(report.path("sessions")).isEmpty();
        // Every student is listed, with no star yet.
        assertThat(report.path("students").findValuesAsText("displayName")).containsExactly("An", "Bình", "Chi");
        assertThat(report.path("students").findValues("stars")).allMatch(v -> v.asLong() == 0);
    }

    @Test
    void countsWhatWasPlayedHowItEndedAndTheStarsOfThePeriod() throws Exception {
        // Two days ago, 9:00: Trắc nghiệm played to the end in 25 minutes, results kept.
        long quiz = play("g-quiz-vn", today.minusDays(2).atTime(9, 0), 25, Map.of("teams", List.of(
                Map.of("name", "Đội Đỏ", "score", 40, "correct", 4),
                Map.of("name", "Đội Xanh", "score", 30, "correct", 3))));
        // Yesterday: Trắc nghiệm again, left open on the projector all night (counted as 2 hours).
        play("g-quiz-vn", today.minusDays(1).atTime(14, 0), 18 * 60, null);
        // Today: Rung chuông vàng, still in progress.
        long bell = play("g-golden-bell", today.atTime(0, 30), null, null);
        // 40 days ago: in the period before only.
        play("g-golden-bell", today.minusDays(40).atTime(10, 0), 10, null);

        star(students.get(1), 3, today.minusDays(1));
        star(students.get(0), 1, today.minusDays(1));
        star(students.get(0), -1, today);
        star(students.get(2), 5, today.minusDays(40));

        JsonNode report = report("");

        assertThat(report.path("summary")).isEqualTo(objectMapper.readTree("""
                {"activities": 3, "completed": 2, "playMinutes": 145, "stars": 3, "correctAnswers": 7, "games": 2}
                """));
        assertThat(report.path("previous")).isEqualTo(objectMapper.readTree("""
                {"activities": 1, "completed": 1, "playMinutes": 10, "stars": 5, "correctAnswers": 0, "games": 1}
                """));

        JsonNode daily = report.path("daily");
        assertThat(daily.get(29)).isEqualTo(day(today, 1, 0));
        assertThat(daily.get(28)).isEqualTo(day(today.minusDays(1), 1, 1));
        assertThat(daily.get(27)).isEqualTo(day(today.minusDays(2), 1, 1));

        assertThat(report.path("byTemplate").findValuesAsText("templateCode")).containsExactly("QUIZ", "GOLDEN_BELL");
        assertThat(report.path("byTemplate").findValues("activities")).extracting(JsonNode::asLong).containsExactly(2L, 1L);
        assertThat(report.path("topGames").get(0).path("gameCode").asText()).isEqualTo("g-quiz-vn");

        // Stars of the period: Bình 3, An 1 - 1, Chi's are older.
        assertThat(report.path("students").findValuesAsText("displayName")).containsExactly("Bình", "An", "Chi");
        assertThat(report.path("students").findValues("stars")).extracting(JsonNode::asLong).containsExactly(3L, 0L, 0L);

        JsonNode sessions = report.path("sessions");
        assertThat(sessions.findValues("id")).extracting(JsonNode::asLong).startsWith(bell).contains(quiz);
        assertThat(sessions.get(0).path("status").asText()).isEqualTo("IN_PROGRESS");
        assertThat(sessions.get(0).has("minutes")).isFalse();
        assertThat(sessions.get(1).path("minutes").asLong()).isEqualTo(120);
        JsonNode first = sessions.get(2);
        assertThat(first.path("gameTitle").asText()).isNotBlank();
        assertThat(first.path("templateName").asText()).isNotBlank();
        assertThat(first.path("minutes").asLong()).isEqualTo(25);
        assertThat(first.path("results").path("teams").findValuesAsText("name")).containsExactly("Đội Đỏ", "Đội Xanh");
    }

    @Test
    void aGameJustAfterMidnightBelongsToTheNewDayOfTheSchool() throws Exception {
        // 00:15 in Hà Nội is 17:15 UTC the day before.
        play("g-quiz-vn", today.atTime(0, 15), 5, null);
        play("g-quiz-vn", today.minusDays(1).atTime(23, 50), 5, null);

        JsonNode report = report("?from=" + today.minusDays(1) + "&to=" + today);

        assertThat(report.path("daily")).containsExactly(day(today.minusDays(1), 1, 1), day(today, 1, 1));
    }

    @Test
    void aPeriodInThePastLeavesOutWhatCameAfter() throws Exception {
        play("g-quiz-vn", today.minusDays(10).atTime(9, 0), 15, null);
        play("g-quiz-vn", today.atTime(9, 0), 15, null);

        JsonNode report = report("?from=" + today.minusDays(14) + "&to=" + today.minusDays(7));

        assertThat(report.path("daily")).hasSize(8);
        assertThat(report.path("summary").path("activities").asLong()).isEqualTo(1);
        assertThat(report.path("sessions")).hasSize(1);
    }

    @Test
    void periodsAreCheckedAndAYearAndADayIsTheMost() throws Exception {
        send(get(path("?from=" + today + "&to=" + today.minusDays(1))), null)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_RANGE"));
        send(get(path("?from=" + today.minusDays(366) + "&to=" + today)), null)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_RANGE"));
        send(get(path("?from=2026-13-01")), null)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PARAMETER"));

        assertThat(report("?from=" + today.minusDays(365) + "&to=" + today).path("daily")).hasSize(366);
        // A single day, and a period given by one end only.
        assertThat(report("?from=" + today + "&to=" + today).path("daily")).hasSize(1);
        assertThat(report("?to=" + today.minusDays(5)).path("from").asText()).isEqualTo(today.minusDays(34).toString());
    }

    @Test
    void onlyTheTeacherOfTheClassSeesItsReport() throws Exception {
        send(get(path("")), otherTeacher())
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
        send(get("/api/v1/reports/classrooms/c-khong-co"), null).andExpect(status().isNotFound());
    }

    // --- Results kept when a game ends ---------------------------------------------------------------------------

    @Test
    void theFirstResultsOfAGameAreKeptAndAnEndWithoutResultsStillWorks() throws Exception {
        long id = start("g-quiz-vn");
        end(id, Map.of("results", Map.of("teams", List.of(Map.of("name", "Đội Đỏ", "score", 20, "correct", 2)))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ENDED"));
        // Ending again (a reload of the results) keeps what was first shown.
        end(id, Map.of("results", Map.of("teams", List.of(Map.of("name", "Đội Vàng", "score", 99, "correct", 9)))))
                .andExpect(status().isOk());
        assertThat(results(id).path("teams").findValuesAsText("name")).containsExactly("Đội Đỏ");

        long bell = start("g-golden-bell");
        end(bell, Map.of("results", Map.of("winners", List.of("An", "Chi"), "players", 3))).andExpect(status().isOk());
        assertThat(results(bell).path("winners")).hasSize(2);

        long plain = start("g-quiz-vn");
        send(post(CLASSES + "/" + classroom + "/sessions/" + plain + "/end"), null).andExpect(status().isOk());
        assertThat(results(plain).isMissingNode()).isTrue();
    }

    @Test
    void resultsThatDoNotReadAreRefusedAndTheGameStaysOpen() throws Exception {
        long id = start("g-quiz-vn");
        List<Map<String, Object>> nineTeams = java.util.stream.IntStream.range(0, 9)
                .mapToObj(i -> Map.<String, Object>of("name", "Đội " + i, "score", 0, "correct", 0)).toList();

        for (Object bad : List.of(
                Map.of("teams", nineTeams),
                Map.of("teams", List.of(Map.of("name", " ", "score", 1, "correct", 1))),
                Map.of("teams", List.of(Map.of("name", "Đội", "score", 1, "correct", -1))),
                Map.of("winners", List.of("x".repeat(51))))) {
            end(id, Map.of("results", bad))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        }
        assertThat(jdbcTemplate.queryForObject("SELECT status FROM game_session WHERE id = ?", String.class, id))
                .isEqualTo("IN_PROGRESS");
    }

    @Test
    void resultsThatNoLongerReadAreLeftOutOfTheReport() throws Exception {
        long id = play("g-quiz-vn", today.atTime(8, 0), 10, null);
        jdbcTemplate.update("UPDATE game_session SET state = '{\"results\": {\"teams\": \"cũ\"}}' WHERE id = ?", id);

        JsonNode report = report("");

        assertThat(report.path("sessions").get(0).has("results")).isFalse();
        assertThat(report.path("summary").path("completed").asLong()).isEqualTo(1);
    }

    // --- Helpers -----------------------------------------------------------------------------------------------

    /**
     * Starts a game with the class at a local time, and ends it {@code minutes} later with these results
     * ({@code null} minutes: still in progress).
     */
    private long play(String game, LocalDateTime startedAt, Integer minutes, Map<String, Object> results) throws Exception {
        long id = start(game);
        if (minutes != null) {
            end(id, results == null ? Map.of() : Map.of("results", results)).andExpect(status().isOk());
        }
        jdbcTemplate.update("UPDATE game_session SET started_at = ?, ended_at = ? WHERE id = ?",
                Timestamp.from(startedAt.atZone(ZONE).toInstant()),
                minutes == null ? null : Timestamp.from(startedAt.plusMinutes(minutes).atZone(ZONE).toInstant()), id);
        return id;
    }

    private long start(String game) throws Exception {
        return body(send(post(CLASSES + "/" + classroom + "/sessions"), Map.of("gameCode", game))
                .andExpect(status().isCreated())).path("id").asLong();
    }

    private ResultActions end(long id, Object body) throws Exception {
        return send(post(CLASSES + "/" + classroom + "/sessions/" + id + "/end"), body);
    }

    private JsonNode results(long id) throws Exception {
        return objectMapper.readTree(jdbcTemplate.queryForObject("SELECT state::text FROM game_session WHERE id = ?",
                String.class, id)).path("results");
    }

    /** Stars given to a student on a day (at noon). */
    private void star(long student, int points, LocalDate day) throws Exception {
        send(post(CLASSES + "/" + classroom + "/students/" + student + "/points"), Map.of("points", points))
                .andExpect(status().isCreated());
        jdbcTemplate.update("""
                UPDATE student_point SET created_at = ?
                WHERE id = (SELECT max(id) FROM student_point WHERE classroom_student_id = ?)
                """, Timestamp.from(day.atTime(12, 0).atZone(ZONE).toInstant()), student);
    }

    private JsonNode day(LocalDate date, long activities, long completed) throws Exception {
        return objectMapper.readTree("{\"date\": \"%s\", \"activities\": %d, \"completed\": %d}"
                .formatted(date, activities, completed));
    }

    private JsonNode report(String query) throws Exception {
        return body(send(get(path(query)), null).andExpect(status().isOk()));
    }

    private String path(String query) {
        return "/api/v1/reports/classrooms/" + classroom + query;
    }

    private ResultActions send(MockHttpServletRequestBuilder request, Object body) throws Exception {
        if (body instanceof String token) {
            request.header(HttpHeaders.AUTHORIZATION, token);
        } else if (body != null) {
            request.contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(body));
        }
        ResultActions result = mockMvc.perform(request);
        // As if each request committed: what it changed is in the tables the SQL of this test reads and writes.
        entityManager.flush();
        entityManager.clear();
        return result;
    }

    private JsonNode body(ResultActions result) throws Exception {
        return objectMapper.readTree(result.andReturn().getResponse().getContentAsString());
    }

    private String otherTeacher() {
        Long userId = jdbcTemplate.queryForObject("""
                INSERT INTO users (code, username, password_hash, display_name, email, role)
                VALUES ('u-test-hoa', 'cohoa', '{noop}123456', 'Cô Hoa', 'cohoa@edugame.local', 'TEACHER')
                RETURNING id
                """, Long.class);
        UserAccount account = new UserAccount(userId, "u-test-hoa", "cohoa", null, UserRole.TEACHER, UserStatus.ACTIVE);
        UUID sid = userSessionService.open(account, false, "test").sid();
        return "Bearer " + accessTokenService.issue(account, sid).accessToken();
    }
}
