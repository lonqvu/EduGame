package com.edugame.auth.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;

import com.edugame.user.domain.UserStatus;
import com.edugame.user.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

/**
 * Refresh token cookie, rotation, reuse detection and sign-out, against the seeded teacher Cô Lan. Requests
 * without a token are anonymous (no default user). Every test is rolled back.
 */
@SpringBootTest(properties = "app.auth.default-user-code=")
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@Transactional
class RefreshTokenApiTest {

    private static final String COOKIE = "edugame_refresh";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private EntityManager entityManager;

    @Test
    void loginSetsAnHttpOnlyStrictCookieOnlyForTheAuthEndpoints() throws Exception {
        String setCookie = login(false).getHeader(HttpHeaders.SET_COOKIE);
        assertThat(setCookie).startsWith(COOKIE + "=").contains("Path=/api/v1/auth", "HttpOnly", "Secure",
                "SameSite=Strict").doesNotContain("Max-Age");

        assertThat(login(true).getHeader(HttpHeaders.SET_COOKIE)).contains("Max-Age=2592000");
    }

    @Test
    void refreshRotatesTheCookieAndGivesAWorkingAccessToken() throws Exception {
        String first = refreshCookie(login(false));

        MockHttpServletResponse refreshed = refresh(first).andExpect(status().isOk())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andReturn().getResponse();
        String second = refreshCookie(refreshed);
        assertThat(second).isNotEqualTo(first);

        me(accessToken(refreshed)).andExpect(status().isOk()).andExpect(jsonPath("$.code").value("u-lan"));
        refresh(second).andExpect(status().isOk());
    }

    @Test
    void tokenJustReplacedStillWorksBrieflyWithoutChangingTheCookie() throws Exception {
        String first = refreshCookie(login(false));
        refresh(first).andExpect(status().isOk());

        // A second tab that sent the old cookie at the same moment.
        refresh(first).andExpect(status().isOk()).andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE));
    }

    @Test
    void reusingAnOldTokenRevokesTheWholeSession() throws Exception {
        MockHttpServletResponse signedIn = login(false);
        String first = refreshCookie(signedIn);
        String second = refreshCookie(refresh(first).andReturn().getResponse());
        // Requests share the test transaction: write pending changes, then forget the cached session.
        entityManager.flush();
        jdbcTemplate.update("UPDATE user_session SET rotated_at = now() - interval '1 minute' WHERE sid = ?::uuid",
                sid(first));
        entityManager.clear();

        refresh(first)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_REFRESH_TOKEN"))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=0")));

        refresh(second).andExpect(status().isUnauthorized());
        me(accessToken(signedIn)).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_TOKEN"));
        assertThat(jdbcTemplate.queryForObject("SELECT revoke_reason FROM user_session WHERE sid = ?::uuid",
                String.class, sid(first)))
                .isEqualTo("TOKEN_REUSE");
    }

    @Test
    void logoutEndsTheSessionAtOnce() throws Exception {
        MockHttpServletResponse signedIn = login(true);
        String cookie = refreshCookie(signedIn);
        me(accessToken(signedIn)).andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/auth/logout").cookie(new Cookie(COOKIE, cookie)))
                .andExpect(status().isNoContent())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=0")));

        me(accessToken(signedIn)).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_TOKEN"));
        refresh(cookie).andExpect(status().isUnauthorized());
    }

    @Test
    void refreshWithoutOrWithGarbageCookieIsRejected() throws Exception {
        mockMvc.perform(post("/api/v1/auth/refresh"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_REFRESH_TOKEN"));
        refresh("garbage").andExpect(status().isUnauthorized());
        refresh("00000000-0000-0000-0000-000000000000.abc").andExpect(status().isUnauthorized());
    }

    @Test
    void lockedTeacherCannotRefresh() throws Exception {
        String cookie = refreshCookie(login(false));
        userRepository.findByCode("u-lan").orElseThrow().setStatus(UserStatus.LOCKED);

        refresh(cookie).andExpect(status().isUnauthorized());
    }

    @Test
    void logoutWithoutCookieStillClearsIt() throws Exception {
        mockMvc.perform(post("/api/v1/auth/logout")).andExpect(status().isNoContent());
    }

    private MockHttpServletResponse login(boolean remember) throws Exception {
        String body = objectMapper.writeValueAsString(
                Map.of("username", "colan", "password", "123456", "remember", remember));
        return mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andReturn().getResponse();
    }

    private ResultActions refresh(String cookie) throws Exception {
        return mockMvc.perform(post("/api/v1/auth/refresh").cookie(new Cookie(COOKIE, cookie)));
    }

    private ResultActions me(String accessToken) throws Exception {
        return mockMvc.perform(get("/api/v1/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken));
    }

    private String accessToken(MockHttpServletResponse response) throws Exception {
        return objectMapper.readTree(response.getContentAsString()).path("accessToken").asText();
    }

    /** The session id part of a refresh token ({@code <sid>.<secret>}). */
    private static String sid(String refreshToken) {
        return refreshToken.substring(0, refreshToken.indexOf('.'));
    }

    private static String refreshCookie(MockHttpServletResponse response) {
        Cookie cookie = response.getCookie(COOKIE);
        assertThat(cookie).as("refresh cookie").isNotNull();
        return cookie.getValue();
    }
}
