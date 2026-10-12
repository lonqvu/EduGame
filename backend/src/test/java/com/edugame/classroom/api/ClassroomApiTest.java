package com.edugame.classroom.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
import org.springframework.transaction.annotation.Transactional;

/**
 * The class list and the stars the games hand out (seeded class 3A of Cô Lan, 28 students), against PostgreSQL.
 * Every test is rolled back.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@Transactional
class ClassroomApiTest {

    private static final String STUDENTS = "/api/v1/classrooms/c-3a/students";

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
    void listsTheClassAndItsStudentsInRollCallOrder() throws Exception {
        mockMvc.perform(get("/api/v1/classrooms")).andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.code == 'c-3a')].name").value("3A"))
                .andExpect(jsonPath("$[?(@.code == 'c-3a')].studentCount").value(28));

        JsonNode students = body(mockMvc.perform(get(STUDENTS)).andExpect(status().isOk()));
        assertThat(students).hasSize(28);
        assertThat(students.get(0).path("displayName").asText()).isEqualTo("Minh Anh");
        assertThat(students.get(0).path("totalStars").asLong()).isEqualTo(12);
        for (int i = 0; i < students.size(); i++) {
            assertThat(students.get(i).path("rollNumber").asInt()).isEqualTo(i + 1);
            assertThat(students.get(i).path("weeklyStars").asLong()).isLessThanOrEqualTo(students.get(i).path("totalStars").asLong());
        }
    }

    @Test
    void starsAddUpAndCanBeTakenBack() throws Exception {
        JsonNode before = firstStudent();
        long id = before.path("id").asLong();

        award(id, "{\"points\": 3, \"reason\": \"  Thắng game  \"}").andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.weeklyStars").value(before.path("weeklyStars").asLong() + 3))
                .andExpect(jsonPath("$.totalStars").value(before.path("totalStars").asLong() + 3));
        award(id, "{\"points\": -1}").andExpect(status().isCreated())
                .andExpect(jsonPath("$.totalStars").value(before.path("totalStars").asLong() + 2));

        assertThat(firstStudent().path("totalStars").asLong()).isEqualTo(before.path("totalStars").asLong() + 2);
        assertThat(jdbcTemplate.queryForList(
                "SELECT reason FROM student_point WHERE classroom_student_id = ? ORDER BY id DESC LIMIT 2", String.class, id))
                .containsExactly(null, "Thắng game");
    }

    @Test
    void rejectsZeroOrTooManyStars() throws Exception {
        long id = firstStudent().path("id").asLong();
        award(id, "{\"points\": 0}").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_POINTS"));
        award(id, "{\"points\": 101}").andExpect(status().isBadRequest());
        award(id, "{\"points\": -101}").andExpect(status().isBadRequest());
        award(id, "{}").andExpect(status().isBadRequest());
        award(id, "{\"points\": 1, \"reason\": \"%s\"}".formatted("x".repeat(101))).andExpect(status().isBadRequest());
    }

    @Test
    void unknownStudentsAndClassesAre404() throws Exception {
        award(999_999_999L, "{\"points\": 1}").andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
        mockMvc.perform(get("/api/v1/classrooms/c-none/students")).andExpect(status().isNotFound());

        // A student who left the class gets no more stars.
        long id = firstStudent().path("id").asLong();
        jdbcTemplate.update("UPDATE classroom_student SET status = 'INACTIVE' WHERE id = ?", id);
        award(id, "{\"points\": 1}").andExpect(status().isNotFound());
        assertThat(body(mockMvc.perform(get(STUDENTS)))).hasSize(27);
    }

    @Test
    void anotherTeacherCannotSeeTheClassOrGiveStars() throws Exception {
        long id = firstStudent().path("id").asLong();
        long totalBefore = firstStudent().path("totalStars").asLong();
        String other = otherTeacher();

        mockMvc.perform(get("/api/v1/classrooms").header(HttpHeaders.AUTHORIZATION, other)).andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(get(STUDENTS).header(HttpHeaders.AUTHORIZATION, other)).andExpect(status().isNotFound());
        mockMvc.perform(post(STUDENTS + "/" + id + "/points").header(HttpHeaders.AUTHORIZATION, other)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"points\": 5}"))
                .andExpect(status().isNotFound());
        assertThat(firstStudent().path("totalStars").asLong()).isEqualTo(totalBefore);
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

    private JsonNode firstStudent() throws Exception {
        return body(mockMvc.perform(get(STUDENTS)).andExpect(status().isOk())).get(0);
    }

    private ResultActions award(long studentId, String json) throws Exception {
        return mockMvc.perform(post(STUDENTS + "/" + studentId + "/points")
                .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private JsonNode body(ResultActions result) throws Exception {
        return objectMapper.readTree(result.andReturn().getResponse().getContentAsString());
    }
}
