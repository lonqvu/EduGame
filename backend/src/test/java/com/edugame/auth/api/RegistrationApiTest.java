package com.edugame.auth.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;

import com.edugame.auth.mail.AuthMail;
import com.edugame.user.domain.User;
import com.edugame.user.domain.UserRole;
import com.edugame.user.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

/**
 * Sign-up with an emailed code. Mails are only published as events here (the transaction is rolled back, so
 * nothing is sent); the tests read the code from the recorded event.
 */
@SpringBootTest(properties = "app.auth.default-user-code=")
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@Transactional
@RecordApplicationEvents
class RegistrationApiTest {

    private static final String EMAIL = "co.hoa@truong.edu.vn";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ApplicationEvents events;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private EntityManager entityManager;

    @Test
    void codeCreatesTheTeacherAndSignsHerIn() throws Exception {
        register(" Co.Hoa@Truong.edu.vn ", "Cô Hoa", "matkhau123")
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.email").value(EMAIL))
                .andExpect(jsonPath("$.expiresIn").value(600))
                .andExpect(jsonPath("$.resendAfter").value(60));
        assertThat(userRepository.findByEmailIgnoreCase(EMAIL)).as("no account before the code").isEmpty();

        String body = verify(EMAIL, lastCode())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(cookie().exists("edugame_refresh"))
                .andReturn().getResponse().getContentAsString();

        User user = userRepository.findByEmailIgnoreCase(EMAIL).orElseThrow();
        assertThat(user.getDisplayName()).isEqualTo("Cô Hoa");
        assertThat(user.getUsername()).isEqualTo("co.hoa");
        assertThat(user.getRole()).isEqualTo(UserRole.TEACHER);
        assertThat(user.getEmailVerifiedAt()).isNotNull();
        assertThat(user.getPasswordHash()).startsWith("{bcrypt}");

        String accessToken = objectMapper.readTree(body).path("accessToken").asText();
        mockMvc.perform(get("/api/v1/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Cô Hoa"));
        login(EMAIL, "matkhau123").andExpect(status().isOk());
    }

    @Test
    void wrongCodesAreCountedThenTheCodeIsVoid() throws Exception {
        register(EMAIL, "Cô Hoa", "matkhau123");
        String code = lastCode();
        String wrong = code.equals("000000") ? "111111" : "000000";

        verify(EMAIL, wrong)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_CODE"))
                .andExpect(jsonPath("$.message").value("Wrong code, 4 attempts left"));
        for (int i = 0; i < 3; i++) {
            verify(EMAIL, wrong).andExpect(jsonPath("$.code").value("INVALID_CODE"));
        }
        verify(EMAIL, wrong).andExpect(jsonPath("$.code").value("CODE_EXPIRED"));
        verify(EMAIL, code).andExpect(jsonPath("$.code").value("CODE_EXPIRED"));
        assertThat(userRepository.findByEmailIgnoreCase(EMAIL)).isEmpty();
    }

    @Test
    void aCodeWorksOnce() throws Exception {
        register(EMAIL, "Cô Hoa", "matkhau123");
        String code = lastCode();
        verify(EMAIL, code).andExpect(status().isOk());
        verify(EMAIL, code).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("CODE_EXPIRED"));
    }

    @Test
    void takenAddressGetsTheSameAnswerAndItsOwnerIsTold() throws Exception {
        register("ColAn@EduGame.local", "Kẻ giả mạo", "matkhau123")
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.email").value("colan@edugame.local"))
                .andExpect(jsonPath("$.expiresIn").value(600))
                .andExpect(jsonPath("$.resendAfter").value(60));

        assertThat(events.stream(AuthMail.VerificationCode.class)).isEmpty();
        assertThat(events.stream(AuthMail.AccountExists.class).map(AuthMail::email))
                .containsExactly("colan@edugame.local");
        verify("colan@edugame.local", "123456").andExpect(jsonPath("$.code").value("CODE_EXPIRED"));
        resend("colan@edugame.local").andExpect(status().isAccepted()).andExpect(jsonPath("$.expiresIn").value(600));
        assertThat(events.stream(AuthMail.VerificationCode.class)).isEmpty();
    }

    @Test
    void resendWaitsForTheCooldownAndReplacesTheCode() throws Exception {
        register(EMAIL, "Cô Hoa", "matkhau123");
        String first = lastCode();
        resend(EMAIL).andExpect(status().isTooManyRequests()).andExpect(jsonPath("$.code").value("RESEND_TOO_SOON"));

        ageCodes(EMAIL, "2 minutes");
        resend(EMAIL).andExpect(status().isAccepted());
        String second = lastCode();

        if (!second.equals(first)) {
            verify(EMAIL, first).andExpect(jsonPath("$.code").value("INVALID_CODE"));
        }
        verify(EMAIL, second).andExpect(status().isOk());
    }

    @Test
    void anAddressGetsAtMostFiveCodesAnHour() throws Exception {
        register(EMAIL, "Cô Hoa", "matkhau123").andExpect(status().isAccepted());
        for (int i = 0; i < 4; i++) {
            ageCodes(EMAIL, "2 minutes");
            resend(EMAIL).andExpect(status().isAccepted());
        }
        ageCodes(EMAIL, "2 minutes");
        resend(EMAIL).andExpect(status().isTooManyRequests()).andExpect(jsonPath("$.code").value("TOO_MANY_CODES"));
    }

    @Test
    void codesRunOut() throws Exception {
        register(EMAIL, "Cô Hoa", "matkhau123");
        String code = lastCode();
        entityManager.flush();
        jdbcTemplate.update("UPDATE email_verification SET expires_at = now() - interval '1 second' WHERE email = ?",
                EMAIL);
        entityManager.clear();

        verify(EMAIL, code).andExpect(jsonPath("$.code").value("CODE_EXPIRED"));
    }

    @Test
    void formIsValidated() throws Exception {
        register("not-an-email", "Cô Hoa", "matkhau123").andExpect(status().isBadRequest());
        register(EMAIL, " ", "matkhau123").andExpect(status().isBadRequest());
        register(EMAIL, "Cô Hoa", "short").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.violations[0].field").value("password"));
        verify(EMAIL, "12ab56").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    /** Moves the codes of an address back in time, past the resend cooldown. */
    private void ageCodes(String email, String interval) {
        entityManager.flush();
        jdbcTemplate.update("UPDATE email_verification SET created_at = created_at - ?::interval WHERE email = ?",
                interval, email);
        entityManager.clear();
    }

    private String lastCode() {
        List<AuthMail.VerificationCode> codes = events.stream(AuthMail.VerificationCode.class).toList();
        assertThat(codes).as("a code was mailed").isNotEmpty();
        String code = codes.getLast().code();
        assertThat(code).matches("\\d{6}");
        return code;
    }

    private ResultActions register(String email, String displayName, String password) throws Exception {
        return postJson("/api/v1/auth/register",
                Map.of("email", email, "displayName", displayName, "password", password));
    }

    private ResultActions resend(String email) throws Exception {
        return postJson("/api/v1/auth/register/resend", Map.of("email", email));
    }

    private ResultActions verify(String email, String code) throws Exception {
        return postJson("/api/v1/auth/register/verify", Map.of("email", email, "code", code));
    }

    private ResultActions login(String username, String password) throws Exception {
        return postJson("/api/v1/auth/login", Map.of("username", username, "password", password));
    }

    private ResultActions postJson(String path, Map<String, ?> body) throws Exception {
        return mockMvc.perform(post(path).contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)));
    }
}
