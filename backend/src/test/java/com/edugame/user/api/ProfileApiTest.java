package com.edugame.user.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;

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
 * "Hồ sơ của tôi" against PostgreSQL and the seeded teacher Cô Lan: the profile and its figures, edits, a new
 * password and signing out of other devices. Requests carry real access tokens (no default user). Every test is
 * rolled back.
 */
@SpringBootTest(properties = "app.auth.default-user-code=")
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@Transactional
class ProfileApiTest {

    private static final String PROFILE = "/api/v1/me/profile";
    private static final String PASSWORD = "/api/v1/me/password";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void theProfileShowsTheAccountAndCountsWhatTheTeacherHasDone() throws Exception {
        String token = login("123456");
        long lan = jdbcTemplate.queryForObject("select id from users where code = 'u-lan'", Long.class);

        JsonNode profile = body(send(get(PROFILE), token, null).andExpect(status().isOk()));

        assertThat(profile.path("code").asText()).isEqualTo("u-lan");
        assertThat(profile.path("displayName").asText()).isEqualTo("Cô Lan");
        assertThat(profile.path("email").asText()).isEqualTo("colan@edugame.local");
        assertThat(profile.path("role").asText()).isEqualTo("TEACHER");
        assertThat(profile.path("memberSince").asText()).isNotBlank();
        JsonNode stats = profile.path("stats");
        assertThat(stats.path("classrooms").asLong()).isEqualTo(count(
                "select count(*) from classroom where teacher_id = ? and status <> 'ARCHIVED'", lan)).isPositive();
        assertThat(stats.path("students").asLong()).isEqualTo(count("""
                select count(*) from classroom_student s join classroom c on c.id = s.classroom_id
                where c.teacher_id = ? and c.status <> 'ARCHIVED' and s.status = 'ACTIVE'""", lan)).isPositive();
        assertThat(stats.path("questionSets").asLong()).isEqualTo(count(
                "select count(*) from question_set where owner_id = ? and status = 'ACTIVE'", lan)).isPositive();
        assertThat(stats.path("activities").asLong()).isEqualTo(count(
                "select count(*) from game_session where host_id = ? and status in ('IN_PROGRESS', 'ENDED')", lan)).isPositive();
    }

    @Test
    void archivingAClassTakesItAndItsStudentsOutOfTheFigures() throws Exception {
        String token = login("123456");
        JsonNode before = body(send(get(PROFILE), token, null)).path("stats");
        long students = count("select count(*) from classroom_student where classroom_id = (select id from classroom where code = 'c-1a') and status = 'ACTIVE'");

        send(delete("/api/v1/classrooms/c-1a"), token, null)
                .andExpect(status().isNoContent());

        JsonNode after = body(send(get(PROFILE), token, null)).path("stats");
        assertThat(after.path("classrooms").asLong()).isEqualTo(before.path("classrooms").asLong() - 1);
        assertThat(after.path("students").asLong()).isEqualTo(before.path("students").asLong() - students);
    }

    @Test
    void editsTheNameThePhoneAndThePicture() throws Exception {
        String token = login("123456");

        send(patch(PROFILE), token, Map.of("displayName", "  Cô Lan Anh ", "phone", "0987 654 321", "avatar", "owl"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Cô Lan Anh"))
                .andExpect(jsonPath("$.phone").value("0987654321"))
                .andExpect(jsonPath("$.avatar").value("owl"))
                .andExpect(jsonPath("$.stats.classrooms").isNumber());

        // Saved: the greeting of the home page uses the new name.
        send(get("/api/v1/me"), token, null).andExpect(jsonPath("$.displayName").value("Cô Lan Anh"));
        send(get(PROFILE), token, null).andExpect(jsonPath("$.phone").value("0987654321"));

        // Blank phone and picture remove them.
        send(patch(PROFILE), token, Map.of("displayName", "Cô Lan", "phone", "", "avatar", ""))
                .andExpect(jsonPath("$.phone").doesNotExist())
                .andExpect(jsonPath("$.avatar").doesNotExist());
    }

    @Test
    void rejectsAWrongProfile() throws Exception {
        String token = login("123456");

        send(patch(PROFILE), token, Map.of("displayName", "   ")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        send(patch(PROFILE), token, Map.of("displayName", "x".repeat(101))).andExpect(status().isBadRequest());
        send(patch(PROFILE), token, Map.of("displayName", "Cô Lan", "phone", "12ab")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PHONE"));
        send(patch(PROFILE), token, Map.of("displayName", "Cô Lan", "avatar", "dragon")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_AVATAR"));

        send(get(PROFILE), token, null).andExpect(jsonPath("$.displayName").value("Cô Lan"));
    }

    @Test
    void theProfileNeedsASignedInTeacher() throws Exception {
        mockMvc.perform(get(PROFILE)).andExpect(status().isUnauthorized());
        mockMvc.perform(patch(PROFILE).contentType(MediaType.APPLICATION_JSON).content("{\"displayName\":\"X\"}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post(PASSWORD).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void aNewPasswordSignsOutTheOtherDevicesButNotThisOne() throws Exception {
        String here = login("123456");
        String otherDevice = login("123456");
        long others = openSessionsOfLan() - 1;

        send(post(PASSWORD), here, Map.of("currentPassword", "123456", "newPassword", "matkhau-moi-2026"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.otherSessions").value(others));
        assertThat(openSessionsOfLan()).isEqualTo(1);

        send(get(PROFILE), here, null).andExpect(status().isOk());
        send(get(PROFILE), otherDevice, null).andExpect(status().isUnauthorized());
        loginFails("123456");
        login("matkhau-moi-2026");
    }

    @Test
    void theCurrentPasswordMustBeRight() throws Exception {
        String token = login("123456");

        send(post(PASSWORD), token, Map.of("currentPassword", "sai-roi", "newPassword", "matkhau-moi-2026"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("WRONG_PASSWORD"));
        send(post(PASSWORD), token, Map.of("currentPassword", "123456", "newPassword", "123456"))
                .andExpect(status().isBadRequest());
        send(post(PASSWORD), token, Map.of("currentPassword", "123456", "newPassword", "ngan"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));

        // Nothing changed: still signed in, the old password still works.
        send(get(PROFILE), token, null).andExpect(status().isOk());
        login("123456");
    }

    @Test
    void signsOutOfTheOtherDevices() throws Exception {
        String here = login("123456");
        String phone = login("123456");
        String tablet = login("123456");
        // The two devices above, and any session left open in the local database.
        long others = openSessionsOfLan() - 1;
        assertThat(others).isGreaterThanOrEqualTo(2);

        send(post("/api/v1/me/sessions/sign-out-others"), here, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.otherSessions").value(others));
        assertThat(openSessionsOfLan()).isEqualTo(1);

        send(get(PROFILE), here, null).andExpect(status().isOk());
        send(get(PROFILE), phone, null).andExpect(status().isUnauthorized());
        send(get(PROFILE), tablet, null).andExpect(status().isUnauthorized());

        // Nobody else left: nothing more to sign out.
        send(post("/api/v1/me/sessions/sign-out-others"), here, null).andExpect(jsonPath("$.otherSessions").value(0));
    }

    private String login(String password) throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("username", "colan", "password", password));
        return body(mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())).path("accessToken").asText();
    }

    private void loginFails(String password) throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("username", "colan", "password", password));
        mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized());
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

    private long openSessionsOfLan() {
        return count("""
                select count(*) from user_session
                where user_id = (select id from users where code = 'u-lan') and revoked_at is null and expires_at > now()""");
    }

    private long count(String sql, Object... args) {
        return jdbcTemplate.queryForObject(sql, Long.class, args);
    }
}
