package com.edugame.feedback.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.edugame.auth.service.AccessTokenService;
import com.edugame.auth.service.UserSessionService;
import com.edugame.feedback.domain.FeedbackKind;
import com.edugame.feedback.dto.FeedbackRules;
import com.edugame.feedback.mail.FeedbackMail;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

/**
 * "Góp ý" against PostgreSQL: teachers send feedback (with a screenshot), the team is mailed, admins read it.
 * Requests carry real access tokens of a new teacher (Cô Hoa), so the hourly limit starts at zero. Every test is
 * rolled back.
 */
@SpringBootTest(properties = "app.auth.default-user-code=")
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@RecordApplicationEvents
@Transactional
class FeedbackApiTest {

    private static final String SEND = "/api/v1/feedback";
    private static final String ADMIN = "/api/v1/admin/feedback";
    private static final String CHROME_WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            + "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

    private static final byte[] PNG = bytes(0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n', 0, 0, 0, 13, 'I', 'H', 'D', 'R');
    private static final byte[] WEBP = bytes('R', 'I', 'F', 'F', 26, 0, 0, 0, 'W', 'E', 'B', 'P', 'V', 'P', '8', ' ');
    private static final byte[] GIF = bytes('G', 'I', 'F', '8', '9', 'a', 1, 0, 1, 0);

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

    @Autowired
    private ApplicationEvents events;

    /** What the requests saved is written before it is read with SQL. */
    @PersistenceContext
    private EntityManager entityManager;

    private String hoa;
    private String admin;

    @BeforeEach
    void signIn() {
        jdbcTemplate.update("""
                INSERT INTO users (code, username, password_hash, display_name, email, role)
                VALUES ('u-test-hoa', 'cohoa', 'x', 'Cô Hoa', 'cohoa@truong.edu.vn', 'TEACHER')
                """);
        Long hoaId = jdbcTemplate.queryForObject("SELECT id FROM users WHERE code = 'u-test-hoa'", Long.class);
        hoa = bearer(new UserAccount(hoaId, "u-test-hoa", "cohoa", null, UserRole.TEACHER, UserStatus.ACTIVE));
        Long lanId = jdbcTemplate.queryForObject("SELECT id FROM users WHERE code = 'u-lan'", Long.class);
        admin = bearer(new UserAccount(lanId, "u-lan", "colan", null, UserRole.ADMIN, UserStatus.ACTIVE));
    }

    // --- Sending ---------------------------------------------------------------------------------------------------

    @Test
    void aTeacherSendsFeedbackWithAScreenshotAndTheTeamIsMailed() throws Exception {
        JsonNode sent = body(send(hoa, feedback(), screenshot(PNG, "image/png"))
                .andExpect(status().isCreated()));
        String code = sent.get("code").asText();
        assertThat(code).matches("fb-[a-z0-9]{10}");
        assertThat(sent.get("createdAt").asText()).isNotBlank();

        entityManager.flush();
        Map<String, Object> row = jdbcTemplate.queryForMap("SELECT * FROM feedback WHERE code = ?", code);
        assertThat(row).containsEntry("kind", "BUG").containsEntry("rating", 2)
                .containsEntry("message", "Không lưu được câu hỏi\ncó ảnh.")
                .containsEntry("page", "/games/g-quiz-vn/edit?tab=2").containsEntry("viewport", "1366x768")
                .containsEntry("app_version", "1.4.0").containsEntry("user_agent", CHROME_WINDOWS)
                .containsEntry("contact_ok", true).containsEntry("status", "NEW");
        assertThat(jdbcTemplate.queryForObject(
                "SELECT s.data FROM feedback_screenshot s JOIN feedback f ON f.id = s.feedback_id WHERE f.code = ?",
                byte[].class, code)).isEqualTo(PNG);

        List<FeedbackMail> mails = events.stream(FeedbackMail.class).toList();
        assertThat(mails).hasSize(1);
        FeedbackMail mail = mails.getFirst();
        assertThat(mail.code()).isEqualTo(code);
        assertThat(mail.kind()).isEqualTo(FeedbackKind.BUG);
        assertThat(mail.teacherName()).isEqualTo("Cô Hoa");
        assertThat(mail.teacherEmail()).isEqualTo("cohoa@truong.edu.vn");
        assertThat(mail.device()).isEqualTo("Chrome trên Windows");
        assertThat(mail.screenshot()).isEqualTo(PNG);
        assertThat(mail.screenshotType()).isEqualTo("image/png");
    }

    @Test
    void withoutConsentTheTeamCannotReplyAndOnlyTheMessageIsNeeded() throws Exception {
        Map<String, Object> minimal = new HashMap<>(Map.of("kind", "IDEA", "message", "  Thêm trò Bingo nhé  "));
        String code = body(send(hoa, minimal, null).andExpect(status().isCreated())).get("code").asText();

        entityManager.flush();
        Map<String, Object> row = jdbcTemplate.queryForMap("SELECT * FROM feedback WHERE code = ?", code);
        assertThat(row).containsEntry("message", "Thêm trò Bingo nhé").containsEntry("contact_ok", false)
                .containsEntry("rating", null).containsEntry("page", null);
        FeedbackMail mail = events.stream(FeedbackMail.class).findFirst().orElseThrow();
        assertThat(mail.teacherEmail()).isNull();
        assertThat(mail.screenshot()).isNull();
    }

    @Test
    void invalidFeedbackIsRefused() throws Exception {
        for (Map<String, Object> change : List.<Map<String, Object>>of(
                Map.of("message", "   "),
                Map.of("message", "a".repeat(FeedbackRules.MAX_MESSAGE + 1)),
                Map.of("rating", 6),
                Map.of("rating", 0),
                Map.of("page", "/" + "a".repeat(500)))) {
            Map<String, Object> request = feedback();
            request.putAll(change);
            send(hoa, request, null).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        }
        Map<String, Object> noKind = feedback();
        noKind.remove("kind");
        send(hoa, noKind, null).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        Map<String, Object> unknownKind = feedback();
        unknownKind.put("kind", "SPAM");
        send(hoa, unknownKind, null).andExpect(status().isBadRequest());
        // A message of exactly the limit is fine.
        Map<String, Object> longest = feedback();
        longest.put("message", "ạ".repeat(FeedbackRules.MAX_MESSAGE));
        send(hoa, longest, null).andExpect(status().isCreated());

        assertThat(feedbackCount()).isEqualTo(1);
    }

    @Test
    void theScreenshotMustBeAReasonablePicture() throws Exception {
        send(hoa, feedback(), screenshot("<svg onload=alert(1)>".getBytes(StandardCharsets.UTF_8), "image/png"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_IMAGE"));
        send(hoa, feedback(), screenshot(GIF, "image/gif"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_IMAGE"));
        byte[] huge = Arrays.copyOf(PNG, FeedbackRules.MAX_SCREENSHOT_BYTES + 1);
        send(hoa, feedback(), screenshot(huge, "image/png"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("IMAGE_TOO_LARGE"));
        assertThat(feedbackCount()).isZero();

        // The type the browser claims does not matter, the bytes do.
        send(hoa, feedback(), screenshot(WEBP, "application/octet-stream")).andExpect(status().isCreated());
        entityManager.flush();
        assertThat(jdbcTemplate.queryForObject("SELECT content_type FROM feedback_screenshot s JOIN feedback f "
                + "ON f.id = s.feedback_id JOIN users u ON u.id = f.user_id WHERE u.code = 'u-test-hoa'", String.class))
                .isEqualTo("image/webp");
    }

    @Test
    void aTeacherSendsAtMostTenAnHour() throws Exception {
        for (int i = 0; i < FeedbackRules.MAX_PER_HOUR; i++) {
            send(hoa, feedback(), null).andExpect(status().isCreated());
        }
        send(hoa, feedback(), null).andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("TOO_MANY_FEEDBACK"));

        // An hour later it works again.
        entityManager.flush();
        jdbcTemplate.update("UPDATE feedback SET created_at = created_at - interval '61 minutes'");
        send(hoa, feedback(), null).andExpect(status().isCreated());
    }

    @Test
    void signingInIsNeeded() throws Exception {
        mockMvc.perform(multipart(SEND).file(feedbackPart(feedback()))).andExpect(status().isUnauthorized());
    }

    // --- Admin -----------------------------------------------------------------------------------------------------

    @Test
    void onlyAdminsReadFeedback() throws Exception {
        mockMvc.perform(get(ADMIN).header(HttpHeaders.AUTHORIZATION, hoa)).andExpect(status().isForbidden());
        mockMvc.perform(get(ADMIN + "/export").header(HttpHeaders.AUTHORIZATION, hoa)).andExpect(status().isForbidden());
        mockMvc.perform(patch(ADMIN + "/fb-x").header(HttpHeaders.AUTHORIZATION, hoa)
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"DONE\"}")).andExpect(status().isForbidden());
    }

    @Test
    void adminsListTheNewestFirstWithTheTeacherAndTheScreenshot() throws Exception {
        String first = code(send(hoa, feedback(), screenshot(PNG, "image/png")));
        Map<String, Object> praise = feedback();
        praise.put("kind", "PRAISE");
        praise.put("contactOk", false);
        String second = code(send(hoa, praise, null));

        JsonNode page = body(mockMvc.perform(get(ADMIN).param("size", "2").header(HttpHeaders.AUTHORIZATION, admin))
                .andExpect(status().isOk()));
        assertThat(page.get("total").asLong()).isGreaterThanOrEqualTo(2);
        JsonNode newest = page.get("items").get(0);
        assertThat(newest.get("code").asText()).isEqualTo(second);
        assertThat(newest.get("kind").asText()).isEqualTo("PRAISE");
        assertThat(newest.has("screenshotUrl")).isFalse();
        JsonNode older = page.get("items").get(1);
        assertThat(older.get("code").asText()).isEqualTo(first);
        assertThat(older.get("teacher").get("displayName").asText()).isEqualTo("Cô Hoa");
        assertThat(older.get("teacher").get("email").asText()).isEqualTo("cohoa@truong.edu.vn");
        assertThat(older.get("device").asText()).isEqualTo("Chrome trên Windows");
        assertThat(older.get("status").asText()).isEqualTo("NEW");
        assertThat(older.get("screenshotUrl").asText()).isEqualTo(ADMIN + "/" + first + "/screenshot");

        mockMvc.perform(get(older.get("screenshotUrl").asText()).header(HttpHeaders.AUTHORIZATION, admin))
                .andExpect(status().isOk())
                .andExpect(content().contentType("image/png"))
                .andExpect(content().bytes(PNG))
                .andExpect(header().string("Content-Security-Policy", "default-src 'none'; sandbox"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"));
        mockMvc.perform(get(ADMIN + "/" + second + "/screenshot").header(HttpHeaders.AUTHORIZATION, admin))
                .andExpect(status().isNotFound());
    }

    @Test
    void adminsMarkFeedbackAndFilterByStatus() throws Exception {
        String code = code(send(hoa, feedback(), null));

        mockMvc.perform(patch(ADMIN + "/" + code).header(HttpHeaders.AUTHORIZATION, admin)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"DONE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(code))
                .andExpect(jsonPath("$.status").value("DONE"));

        JsonNode done = body(mockMvc.perform(get(ADMIN).param("status", "DONE").header(HttpHeaders.AUTHORIZATION, admin)));
        assertThat(done.get("items").findValuesAsText("code")).contains(code);
        JsonNode open = body(mockMvc.perform(get(ADMIN).param("status", "NEW", "SEEN").header(HttpHeaders.AUTHORIZATION, admin)));
        assertThat(open.get("items").findValuesAsText("code")).doesNotContain(code);

        mockMvc.perform(patch(ADMIN + "/fb-nope").header(HttpHeaders.AUTHORIZATION, admin)
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"DONE\"}")).andExpect(status().isNotFound());
        mockMvc.perform(patch(ADMIN + "/" + code).header(HttpHeaders.AUTHORIZATION, admin)
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"LOST\"}")).andExpect(status().isBadRequest());
    }

    @Test
    void adminsExportACsvExcelOpensSafely() throws Exception {
        Map<String, Object> formula = feedback();
        formula.put("message", "=HYPERLINK(\"http://x\")");
        String code = code(send(hoa, formula, null));

        byte[] csv = mockMvc.perform(get(ADMIN + "/export").header(HttpHeaders.AUTHORIZATION, admin))
                .andExpect(status().isOk())
                .andExpect(content().contentType("text/csv;charset=UTF-8"))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
                        org.hamcrest.Matchers.matchesPattern("attachment; filename=\"gop-y-edugame-\\d{8}\\.csv\"")))
                .andReturn().getResponse().getContentAsByteArray();
        String text = new String(csv, StandardCharsets.UTF_8);
        assertThat(text).startsWith("﻿\"Mã\",\"Thời gian\",\"Loại\"");
        assertThat(text).contains("\"" + code + "\"", "\"Báo lỗi\"", "\"'=HYPERLINK(\"\"http://x\"\")\"", "\"Cô Hoa\"");
    }

    // --- Helpers ---------------------------------------------------------------------------------------------------

    private static Map<String, Object> feedback() {
        Map<String, Object> feedback = new HashMap<>();
        feedback.put("kind", "BUG");
        feedback.put("rating", 2);
        feedback.put("message", "Không lưu được câu hỏi\ncó ảnh.");
        feedback.put("page", "/games/g-quiz-vn/edit?tab=2");
        feedback.put("viewport", "1366x768");
        feedback.put("appVersion", "1.4.0");
        feedback.put("contactOk", true);
        return feedback;
    }

    private MockMultipartFile feedbackPart(Map<String, Object> feedback) throws Exception {
        return new MockMultipartFile("feedback", "", MediaType.APPLICATION_JSON_VALUE, objectMapper.writeValueAsBytes(feedback));
    }

    private static MockMultipartFile screenshot(byte[] bytes, String type) {
        return new MockMultipartFile("screenshot", "anh.png", type, bytes);
    }

    private ResultActions send(String token, Map<String, Object> feedback, MockMultipartFile screenshot) throws Exception {
        MockMultipartHttpServletRequestBuilder request = multipart(SEND).file(feedbackPart(feedback));
        if (screenshot != null) {
            request.file(screenshot);
        }
        return mockMvc.perform(request.header(HttpHeaders.AUTHORIZATION, token).header(HttpHeaders.USER_AGENT, CHROME_WINDOWS));
    }

    private String code(ResultActions sent) throws Exception {
        return body(sent.andExpect(status().isCreated())).get("code").asText();
    }

    private long feedbackCount() {
        entityManager.flush();
        return jdbcTemplate.queryForObject(
                "SELECT count(*) FROM feedback f JOIN users u ON u.id = f.user_id WHERE u.code = 'u-test-hoa'", Long.class);
    }

    private JsonNode body(ResultActions result) throws Exception {
        return objectMapper.readTree(result.andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8));
    }

    private String bearer(UserAccount account) {
        UUID sid = userSessionService.open(account, false, "test").sid();
        return "Bearer " + accessTokenService.issue(account, sid).accessToken();
    }

    private static byte[] bytes(int... values) {
        byte[] bytes = new byte[values.length];
        for (int i = 0; i < values.length; i++) {
            bytes[i] = (byte) values[i];
        }
        return bytes;
    }
}
