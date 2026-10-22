package com.edugame.admin.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
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
 * "Quản trị" against PostgreSQL: the overview, the teachers and what an admin may do to them, and the admin log.
 * Requests carry real access tokens: the seeded admin (u-admin) and a new teacher (Cô Hoa) made by each test.
 * Every test is rolled back.
 */
@SpringBootTest(properties = "app.auth.default-user-code=")
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@Transactional
class AdminApiTest {

    private static final String ADMIN = "/api/v1/admin";
    private static final String HOA = "u-test-hoa";

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

    /** What the requests changed is written out before it is read with SQL, and read again after. */
    @PersistenceContext
    private EntityManager entityManager;

    private String admin;
    private String hoa;

    @BeforeEach
    void signIn() {
        jdbcTemplate.update("""
                INSERT INTO users (code, username, password_hash, display_name, email, role)
                VALUES (?, 'cohoa', '{noop}123456', 'Cô Hoa', 'cohoa@truong.edu.vn', 'TEACHER')
                """, HOA);
        admin = bearer("u-admin", UserRole.ADMIN);
        hoa = bearer(HOA, UserRole.TEACHER);
    }

    // --- Access ----------------------------------------------------------------------------------------------------

    @Test
    void onlyAdminsUseTheAdminPages() throws Exception {
        for (MockHttpServletRequestBuilder request : List.of(get(ADMIN + "/dashboard"), get(ADMIN + "/teachers"),
                get(ADMIN + "/teachers/u-lan"), get(ADMIN + "/audit-log"), post(ADMIN + "/teachers/u-lan/lock"),
                put(ADMIN + "/teachers/u-lan/role").contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"ADMIN\"}"))) {
            mockMvc.perform(request.header(HttpHeaders.AUTHORIZATION, hoa)).andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        }
        mockMvc.perform(get(ADMIN + "/dashboard")).andExpect(status().isUnauthorized());
    }

    // --- Overview --------------------------------------------------------------------------------------------------

    @Test
    void theOverviewCountsTeachersContentAndGamesPlayed() throws Exception {
        JsonNode before = body(send(get(ADMIN + "/dashboard?days=7"), admin).andExpect(status().isOk()));

        // A game played today by Cô Lan.
        jdbcTemplate.update("""
                INSERT INTO game_session (game_id, game_version_id, host_id, status, started_at, ended_at)
                SELECT g.id, v.id, g.owner_id, 'ENDED', now(), now()
                FROM game g JOIN game_version v ON v.game_id = g.id WHERE g.code = 'g-quiz-vn' LIMIT 1
                """);
        JsonNode after = body(send(get(ADMIN + "/dashboard?days=7"), admin).andExpect(status().isOk()));

        LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        assertThat(after.get("to").asText()).isEqualTo(today.toString());
        assertThat(after.get("from").asText()).isEqualTo(today.minusDays(6).toString());
        assertThat(after.get("daily")).hasSize(7);
        JsonNode lastDay = after.get("daily").get(6);
        assertThat(lastDay.get("date").asText()).isEqualTo(today.toString());
        // Cô Hoa joined today.
        assertThat(lastDay.get("signUps").asLong()).isGreaterThanOrEqualTo(1);
        assertThat(after.at("/teachers/joined").asLong()).isGreaterThanOrEqualTo(1);
        assertThat(after.at("/teachers/admins").asLong()).isGreaterThanOrEqualTo(1);
        assertThat(after.at("/content/students").asLong()).isGreaterThanOrEqualTo(28);

        assertThat(after.get("plays").asLong()).isEqualTo(before.get("plays").asLong() + 1);
        assertThat(lastDay.get("plays").asLong()).isEqualTo(before.get("daily").get(6).get("plays").asLong() + 1);
        assertThat(after.get("topTemplates").findValuesAsText("templateCode")).contains("QUIZ");

        send(get(ADMIN + "/dashboard?days=0"), admin).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_RANGE"));
        send(get(ADMIN + "/dashboard?days=367"), admin).andExpect(status().isBadRequest());
        assertThat(body(send(get(ADMIN + "/dashboard"), admin)).get("daily")).hasSize(30);
    }

    // --- Teachers --------------------------------------------------------------------------------------------------

    @Test
    void teachersAreSearchedFilteredSortedAndPaged() throws Exception {
        JsonNode found = body(send(get(ADMIN + "/teachers?q=HOA"), admin).andExpect(status().isOk()));
        assertThat(found.get("total").asLong()).isEqualTo(1);
        JsonNode row = found.get("items").get(0);
        assertThat(row.get("code").asText()).isEqualTo(HOA);
        assertThat(row.get("email").asText()).isEqualTo("cohoa@truong.edu.vn");
        assertThat(row.get("role").asText()).isEqualTo("TEACHER");
        assertThat(row.get("status").asText()).isEqualTo("ACTIVE");
        assertThat(row.get("classrooms").asLong()).isZero();
        assertThat(row.has("passwordHash")).isFalse();

        // By email, and "%" / "_" are searched for as they are.
        assertThat(body(send(get(ADMIN + "/teachers?q=truong.edu"), admin)).get("total").asLong()).isEqualTo(1);
        assertThat(body(send(get(ADMIN + "/teachers?q=%25"), admin)).get("total").asLong()).isZero();
        assertThat(body(send(get(ADMIN + "/teachers?q=_"), admin)).get("total").asLong()).isZero();

        JsonNode admins = body(send(get(ADMIN + "/teachers?role=ADMIN"), admin));
        assertThat(admins.get("items").findValuesAsText("code")).contains("u-admin").doesNotContain(HOA, "u-lan");

        JsonNode byName = body(send(get(ADMIN + "/teachers?sort=NAME&size=100"), admin));
        List<String> names = byName.get("items").findValuesAsText("displayName");
        assertThat(names).isSortedAccordingTo(String.CASE_INSENSITIVE_ORDER);

        // Most recently active first; never-used accounts last.
        jdbcTemplate.update("UPDATE users SET last_login_at = now() + interval '1 hour' WHERE code = 'u-thu'");
        JsonNode byActivity = body(send(get(ADMIN + "/teachers?sort=LAST_ACTIVE&size=100"), admin).andExpect(status().isOk()));
        assertThat(byActivity.at("/items/0/code").asText()).isEqualTo("u-thu");
        send(get(ADMIN + "/teachers?sort=SHUFFLE"), admin).andExpect(status().isBadRequest());

        JsonNode firstPage = body(send(get(ADMIN + "/teachers?size=1"), admin));
        assertThat(firstPage.get("items")).hasSize(1);
        assertThat(firstPage.get("total").asLong()).isGreaterThanOrEqualTo(4);
        // Newest first: Cô Hoa, made just now.
        assertThat(firstPage.at("/items/0/code").asText()).isEqualTo(HOA);
        JsonNode beyond = body(send(get(ADMIN + "/teachers?page=50&size=100"), admin));
        assertThat(beyond.get("items")).isEmpty();
        assertThat(beyond.get("total").asLong()).isEqualTo(firstPage.get("total").asLong());

        // Deleted accounts only when asked for.
        jdbcTemplate.update("UPDATE users SET status = 'DELETED' WHERE code = ?", HOA);
        assertThat(body(send(get(ADMIN + "/teachers?q=hoa"), admin)).get("total").asLong()).isZero();
        assertThat(body(send(get(ADMIN + "/teachers?q=hoa&status=DELETED"), admin)).get("total").asLong()).isEqualTo(1);
        send(post(ADMIN + "/teachers/" + HOA + "/lock"), admin).andExpect(status().isNotFound());
    }

    @Test
    void oneTeacherShowsFiguresDevicesAndNoStudentNames() throws Exception {
        jdbcTemplate.update("""
                INSERT INTO user_known_device (user_id, device) SELECT id, 'Chrome trên Windows' FROM users WHERE code = 'u-lan'
                ON CONFLICT DO NOTHING
                """);
        JsonNode lan = body(send(get(ADMIN + "/teachers/u-lan"), admin).andExpect(status().isOk()));

        assertThat(lan.get("displayName").asText()).isEqualTo("Cô Lan");
        assertThat(lan.at("/figures/classrooms").asLong()).isGreaterThanOrEqualTo(1);
        assertThat(lan.at("/figures/students").asLong()).isGreaterThanOrEqualTo(28);
        assertThat(lan.at("/figures/games").asLong()).isGreaterThanOrEqualTo(1);
        assertThat(lan.get("devices").findValuesAsText("name")).contains("Chrome trên Windows");
        assertThat(lan.get("self").asBoolean()).isFalse();
        assertThat(lan.has("loginBlockedUntil")).isFalse();
        // Students are counted, never listed.
        assertThat(lan.toString()).doesNotContain("Minh Anh");

        assertThat(body(send(get(ADMIN + "/teachers/u-admin"), admin)).get("self").asBoolean()).isTrue();
        send(get(ADMIN + "/teachers/u-nobody"), admin).andExpect(status().isNotFound());
    }

    @Test
    void lockingSignsTheTeacherOutAndKeepsThemOutUntilUnlocked() throws Exception {
        me(hoa).andExpect(status().isOk());

        JsonNode locked = body(send(post(ADMIN + "/teachers/" + HOA + "/lock"), admin, Map.of("reason", "  Tài khoản bị lộ  "))
                .andExpect(status().isOk()));
        assertThat(locked.get("status").asText()).isEqualTo("LOCKED");
        assertThat(locked.get("openSessions").asLong()).isZero();
        assertThat(locked.at("/history/0/action").asText()).isEqualTo("TEACHER_LOCKED");
        assertThat(locked.at("/history/0/details/reason").asText()).isEqualTo("Tài khoản bị lộ");
        assertThat(locked.at("/history/0/details/sessionsEnded").asInt()).isEqualTo(1);
        assertThat(locked.at("/history/0/actorName").asText()).isEqualTo("Quản trị Lớp Vui");

        // The token in use stops working at once, and the password no longer signs in.
        me(hoa).andExpect(status().isUnauthorized());
        login("cohoa").andExpect(status().isUnauthorized());

        // Locking again changes nothing.
        send(post(ADMIN + "/teachers/" + HOA + "/lock"), admin).andExpect(status().isOk());
        assertThat(logCount("TEACHER_LOCKED")).isEqualTo(1);

        JsonNode unlocked = body(send(post(ADMIN + "/teachers/" + HOA + "/unlock"), admin).andExpect(status().isOk()));
        assertThat(unlocked.get("status").asText()).isEqualTo("ACTIVE");
        assertThat(unlocked.at("/history/0/action").asText()).isEqualTo("TEACHER_UNLOCKED");
        login("cohoa").andExpect(status().isOk());
    }

    @Test
    void anAdminCannotChangeTheirOwnAccountNorLockAnotherAdmin() throws Exception {
        for (MockHttpServletRequestBuilder request : List.of(post(ADMIN + "/teachers/u-admin/lock"),
                post(ADMIN + "/teachers/u-admin/sign-out"), post(ADMIN + "/teachers/u-admin/login-unblock"))) {
            send(request, admin).andExpect(status().isConflict())
                    .andExpect(jsonPath("$.code").value("CANNOT_CHANGE_OWN_ACCOUNT"));
        }
        send(put(ADMIN + "/teachers/u-admin/role"), admin, Map.of("role", "TEACHER")).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CANNOT_CHANGE_OWN_ACCOUNT"));

        send(put(ADMIN + "/teachers/" + HOA + "/role"), admin, Map.of("role", "ADMIN")).andExpect(status().isOk());
        send(post(ADMIN + "/teachers/" + HOA + "/lock"), admin).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ADMIN_CANNOT_BE_LOCKED"));

        send(post(ADMIN + "/teachers/u-lan/lock"), admin, Map.of("reason", "x".repeat(301)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        send(put(ADMIN + "/teachers/u-lan/role"), admin, Map.of("role", "OWNER")).andExpect(status().isBadRequest());
        assertThat(logCount(null)).isEqualTo(1);
    }

    @Test
    void theAdminRoleIsGivenAndTakenAway() throws Exception {
        JsonNode granted = body(send(put(ADMIN + "/teachers/" + HOA + "/role"), admin, Map.of("role", "ADMIN"))
                .andExpect(status().isOk()));
        assertThat(granted.get("role").asText()).isEqualTo("ADMIN");
        assertThat(granted.at("/history/0/action").asText()).isEqualTo("ADMIN_GRANTED");
        // Still signed in; a new sign-in carries the role.
        me(hoa).andExpect(status().isOk());
        String hoaAsAdmin = accessToken(login("cohoa").andExpect(status().isOk()));
        mockMvc.perform(get(ADMIN + "/dashboard").header(HttpHeaders.AUTHORIZATION, hoaAsAdmin))
                .andExpect(status().isOk());

        // Same role again: nothing to log.
        send(put(ADMIN + "/teachers/" + HOA + "/role"), admin, Map.of("role", "ADMIN")).andExpect(status().isOk());
        assertThat(logCount("ADMIN_GRANTED")).isEqualTo(1);

        // Taken away: every session ends, so no token keeps the admin role.
        JsonNode revoked = body(send(put(ADMIN + "/teachers/" + HOA + "/role"), admin, Map.of("role", "TEACHER"))
                .andExpect(status().isOk()));
        assertThat(revoked.get("role").asText()).isEqualTo("TEACHER");
        assertThat(revoked.at("/history/0/action").asText()).isEqualTo("ADMIN_REVOKED");
        mockMvc.perform(get(ADMIN + "/dashboard").header(HttpHeaders.AUTHORIZATION, hoaAsAdmin))
                .andExpect(status().isUnauthorized());
        me(hoa).andExpect(status().isUnauthorized());
        assertThat(jdbcTemplate.queryForList("""
                SELECT DISTINCT s.revoke_reason FROM user_session s JOIN users u ON u.id = s.user_id WHERE u.code = ?
                """, String.class, HOA)).containsExactly("BY_ADMIN");
    }

    @Test
    void aLockedTeacherIsNotMadeAdminAndTheLastAdminKeepsTheRole() throws Exception {
        send(post(ADMIN + "/teachers/" + HOA + "/lock"), admin).andExpect(status().isOk());
        send(put(ADMIN + "/teachers/" + HOA + "/role"), admin, Map.of("role", "ADMIN")).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TEACHER_LOCKED"));

        // Cô Lan holds an admin token but is not an admin in the database: u-admin is the only one left.
        jdbcTemplate.update("UPDATE users SET role = 'TEACHER' WHERE role = 'ADMIN' AND code <> 'u-admin'");
        send(put(ADMIN + "/teachers/u-admin/role"), bearer("u-lan", UserRole.ADMIN), Map.of("role", "TEACHER"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("LAST_ADMIN"));
    }

    @Test
    void signingOutEndsEverySessionOfTheTeacher() throws Exception {
        String second = bearer(HOA, UserRole.TEACHER);
        JsonNode before = body(send(get(ADMIN + "/teachers/" + HOA), admin));
        assertThat(before.get("openSessions").asLong()).isEqualTo(2);

        JsonNode after = body(send(post(ADMIN + "/teachers/" + HOA + "/sign-out"), admin).andExpect(status().isOk()));
        assertThat(after.get("openSessions").asLong()).isZero();
        assertThat(after.get("status").asText()).isEqualTo("ACTIVE");
        assertThat(after.at("/history/0/action").asText()).isEqualTo("TEACHER_SIGNED_OUT");
        assertThat(after.at("/history/0/details/sessionsEnded").asInt()).isEqualTo(2);
        me(hoa).andExpect(status().isUnauthorized());
        me(second).andExpect(status().isUnauthorized());
        // The password still works.
        login("cohoa@truong.edu.vn").andExpect(status().isOk());
    }

    @Test
    void theSignInBlockIsShownAndLifted() throws Exception {
        jdbcTemplate.update("""
                INSERT INTO login_throttle (throttle_key, failures, window_started_at, locked_until)
                VALUES ('user:cohoa@truong.edu.vn', 5, now(), now() + interval '15 minutes')
                """);
        login("cohoa@truong.edu.vn").andExpect(status().isTooManyRequests());
        JsonNode blocked = body(send(get(ADMIN + "/teachers/" + HOA), admin));
        assertThat(blocked.get("loginBlockedUntil").asText()).isNotBlank();

        JsonNode lifted = body(send(post(ADMIN + "/teachers/" + HOA + "/login-unblock"), admin)
                .andExpect(status().isOk()));
        assertThat(lifted.has("loginBlockedUntil")).isFalse();
        assertThat(lifted.at("/history/0/action").asText()).isEqualTo("LOGIN_UNBLOCKED");
        assertThat(lifted.at("/history/0/details/blockedUntil").asText()).isNotBlank();
        login("cohoa@truong.edu.vn").andExpect(status().isOk());
    }

    // --- Admin log -------------------------------------------------------------------------------------------------

    @Test
    void theLogListsEveryChangeNewestFirstAndFiltersByAction() throws Exception {
        send(post(ADMIN + "/teachers/" + HOA + "/lock"), admin).andExpect(status().isOk());
        send(post(ADMIN + "/teachers/" + HOA + "/unlock"), admin).andExpect(status().isOk());
        send(post(ADMIN + "/teachers/" + HOA + "/sign-out"), admin).andExpect(status().isOk());

        JsonNode log = body(send(get(ADMIN + "/audit-log?size=3"), admin).andExpect(status().isOk()));
        assertThat(log.get("items").findValuesAsText("action"))
                .containsExactly("TEACHER_SIGNED_OUT", "TEACHER_UNLOCKED", "TEACHER_LOCKED");
        JsonNode first = log.at("/items/0");
        assertThat(first.get("targetType").asText()).isEqualTo("TEACHER");
        assertThat(first.get("targetCode").asText()).isEqualTo(HOA);
        assertThat(first.get("targetLabel").asText()).isEqualTo("Cô Hoa (cohoa@truong.edu.vn)");
        assertThat(first.get("actorName").asText()).isEqualTo("Quản trị Lớp Vui");

        JsonNode locks = body(send(get(ADMIN + "/audit-log?action=TEACHER_LOCKED&action=TEACHER_UNLOCKED"), admin));
        assertThat(locks.get("items").findValuesAsText("action")).doesNotContain("TEACHER_SIGNED_OUT");
        send(get(ADMIN + "/audit-log?action=DELETED_EVERYTHING"), admin).andExpect(status().isBadRequest());
    }

    // --- Helpers ---------------------------------------------------------------------------------------------------

    private ResultActions send(MockHttpServletRequestBuilder request, String token) throws Exception {
        return mockMvc.perform(request.header(HttpHeaders.AUTHORIZATION, token));
    }

    private ResultActions send(MockHttpServletRequestBuilder request, String token, Map<String, ?> body) throws Exception {
        return send(request.contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(body)), token);
    }

    private ResultActions me(String token) throws Exception {
        return mockMvc.perform(get("/api/v1/me").header(HttpHeaders.AUTHORIZATION, token));
    }

    private ResultActions login(String username) throws Exception {
        entityManager.flush();
        entityManager.clear();
        return mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("username", username, "password", "123456"))));
    }

    private long logCount(String action) {
        entityManager.flush();
        return action == null
                ? jdbcTemplate.queryForObject("SELECT count(*) FROM admin_audit_log WHERE target_code = ?", Long.class, HOA)
                : jdbcTemplate.queryForObject("SELECT count(*) FROM admin_audit_log WHERE target_code = ? AND action = ?",
                        Long.class, HOA, action);
    }

    private JsonNode body(ResultActions result) throws Exception {
        return objectMapper.readTree(result.andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8));
    }

    private String accessToken(ResultActions result) throws Exception {
        return "Bearer " + body(result).get("accessToken").asText();
    }

    /** Token of a real sign-in session of this account, carrying the given role. */
    private String bearer(String code, UserRole role) {
        Long id = jdbcTemplate.queryForObject("SELECT id FROM users WHERE code = ?", Long.class, code);
        UserAccount account = new UserAccount(id, code, code, null, role, UserStatus.ACTIVE);
        UUID sid = userSessionService.open(account, false, "test").sid();
        return "Bearer " + accessTokenService.issue(account, sid).accessToken();
    }
}
