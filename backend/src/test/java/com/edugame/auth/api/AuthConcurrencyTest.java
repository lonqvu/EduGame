package com.edugame.auth.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
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

/**
 * Requests racing each other, as real browsers do: these need real commits in PostgreSQL, so this class is not
 * rolled back. Every row it creates is tagged (username prefix, client address, browser name) and deleted after
 * each test.
 */
@SpringBootTest(properties = "app.auth.default-user-code=")
@AutoConfigureMockMvc
@ActiveProfiles("dev")
class AuthConcurrencyTest {

    private static final String COOKIE = "edugame_refresh";
    private static final String USER_AGENT = "auth-concurrency-test";
    private static final String IP = "10.77.0.1";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbc;

    @AfterEach
    void cleanUp() {
        jdbc.update("DELETE FROM login_throttle WHERE throttle_key LIKE 'user:race-%' OR throttle_key = ?",
                "ip:" + IP);
        jdbc.update("DELETE FROM user_session WHERE user_agent = ?", USER_AGENT);
    }

    @Test
    void simultaneousWrongPasswordsAreAllCounted() throws Exception {
        String username = "race-" + UUID.randomUUID();
        List<Integer> statuses = runAtOnce(12, () -> mockMvc.perform(post("/api/v1/auth/login")
                        .with(request -> {
                            request.setRemoteAddr(IP);
                            return request;
                        })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("username", username, "password", "wrong"))))
                .andReturn().getResponse().getStatus());

        assertThat(statuses).as("only wrong-password or locked answers, never an error")
                .allMatch(status -> status == 401 || status == 429);
        long wrong = statuses.stream().filter(status -> status == 401).count();
        Integer counted = jdbc.queryForObject("SELECT failures FROM login_throttle WHERE throttle_key = ?",
                Integer.class, "user:" + username);
        assertThat(counted).as("no failure lost between concurrent requests").isEqualTo((int) wrong);
        assertThat(jdbc.queryForObject("SELECT locked_until > now() FROM login_throttle WHERE throttle_key = ?",
                Boolean.class, "user:" + username)).isTrue();
    }

    @Test
    void twoTabsRefreshingTogetherStaySignedIn() throws Exception {
        MockHttpServletResponse signedIn = mockMvc.perform(post("/api/v1/auth/login")
                        .header(HttpHeaders.USER_AGENT, USER_AGENT)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("username", "colan", "password", "123456"))))
                .andReturn().getResponse();
        assertThat(signedIn.getStatus()).isEqualTo(200);
        String cookie = signedIn.getCookie(COOKIE).getValue();

        List<MockHttpServletResponse> tabs = runAtOnce(2, () -> mockMvc.perform(post("/api/v1/auth/refresh")
                .cookie(new Cookie(COOKIE, cookie))).andReturn().getResponse());

        assertThat(tabs).allMatch(tab -> tab.getStatus() == 200);
        List<String> newCookies = tabs.stream().map(tab -> tab.getCookie(COOKIE)).filter(c -> c != null)
                .map(Cookie::getValue).toList();
        assertThat(newCookies).as("exactly one tab rotated the cookie").hasSize(1);

        String sid = cookie.substring(0, cookie.indexOf('.'));
        assertThat(jdbc.queryForObject("SELECT revoked_at IS NULL FROM user_session WHERE sid = ?::uuid",
                Boolean.class, sid)).as("not mistaken for a stolen token").isTrue();
        assertThat(mockMvc.perform(post("/api/v1/auth/refresh").cookie(new Cookie(COOKIE, newCookies.getFirst())))
                .andReturn().getResponse().getStatus()).isEqualTo(200);
    }

    /** Runs {@code count} copies of the task, released together, and returns their results. */
    private static <T> List<T> runAtOnce(int count, Callable<T> task) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(count);
        try {
            CountDownLatch start = new CountDownLatch(1);
            List<Future<T>> futures = new ArrayList<>();
            for (int i = 0; i < count; i++) {
                futures.add(pool.submit(() -> {
                    start.await();
                    return task.call();
                }));
            }
            start.countDown();
            List<T> results = new ArrayList<>();
            for (Future<T> future : futures) {
                results.add(future.get());
            }
            return results;
        } finally {
            pool.shutdownNow();
        }
    }
}
