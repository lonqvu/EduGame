package com.edugame.auth.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;

import com.edugame.auth.domain.VerificationPurpose;
import com.edugame.auth.mail.AuthMail;
import com.edugame.user.domain.UserStatus;
import com.edugame.user.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

/** Forgotten password, against the seeded teacher Cô Lan (colan@edugame.local / 123456). Rolled back. */
@SpringBootTest(properties = "app.auth.default-user-code=")
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@Transactional
@RecordApplicationEvents
class PasswordResetApiTest {

    private static final String EMAIL = "colan@edugame.local";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ApplicationEvents events;

    @Autowired
    private UserRepository userRepository;

    @Test
    void codeSetsTheNewPasswordEndsOldSessionsAndSignsIn() throws Exception {
        String oldAccessToken = accessToken(login("colan", "123456").andExpect(status().isOk()));

        forgot(" ColAn@EduGame.local ")
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.email").value(EMAIL))
                .andExpect(jsonPath("$.expiresIn").value(600));
        String code = lastCode();

        String newAccessToken = accessToken(reset(EMAIL, code, "matkhaumoi1")
                .andExpect(status().isOk())
                .andExpect(cookie().exists("edugame_refresh")));

        login("colan", "123456").andExpect(status().isUnauthorized());
        login("colan", "matkhaumoi1").andExpect(status().isOk());
        me(oldAccessToken).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("INVALID_TOKEN"));
        me(newAccessToken).andExpect(status().isOk()).andExpect(jsonPath("$.code").value("u-lan"));
        assertThat(userRepository.findByCode("u-lan").orElseThrow().getEmailVerifiedAt()).isNotNull();

        reset(EMAIL, code, "matkhaukhac2").andExpect(jsonPath("$.code").value("CODE_EXPIRED"));
    }

    @Test
    void unknownAddressGetsTheSameAnswerAndNoMail() throws Exception {
        forgot("nobody@truong.edu.vn")
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.email").value("nobody@truong.edu.vn"))
                .andExpect(jsonPath("$.expiresIn").value(600))
                .andExpect(jsonPath("$.resendAfter").value(60));
        assertThat(events.stream(AuthMail.class)).isEmpty();

        reset("nobody@truong.edu.vn", "123456", "matkhaumoi1").andExpect(jsonPath("$.code").value("CODE_EXPIRED"));
        forgot("nobody@truong.edu.vn").andExpect(jsonPath("$.code").value("RESEND_TOO_SOON"));
    }

    @Test
    void lockedAccountGetsNoCode() throws Exception {
        userRepository.findByCode("u-lan").orElseThrow().setStatus(UserStatus.LOCKED);

        forgot(EMAIL).andExpect(status().isAccepted());
        assertThat(events.stream(AuthMail.class)).isEmpty();
    }

    @Test
    void wrongCodeIsCountedAndPasswordStays() throws Exception {
        forgot(EMAIL);
        String code = lastCode();
        reset(EMAIL, code.equals("000000") ? "111111" : "000000", "matkhaumoi1")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_CODE"));
        login("colan", "123456").andExpect(status().isOk());
    }

    @Test
    void newPasswordIsValidated() throws Exception {
        reset(EMAIL, "123456", "short").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.violations[0].field").value("newPassword"));
    }

    private String lastCode() {
        List<AuthMail.VerificationCode> codes = events.stream(AuthMail.VerificationCode.class).toList();
        assertThat(codes).as("a code was mailed").isNotEmpty();
        assertThat(codes.getLast().purpose()).isEqualTo(VerificationPurpose.RESET_PASSWORD);
        return codes.getLast().code();
    }

    private ResultActions forgot(String email) throws Exception {
        return postJson("/api/v1/auth/password/forgot", Map.of("email", email));
    }

    private ResultActions reset(String email, String code, String newPassword) throws Exception {
        return postJson("/api/v1/auth/password/reset", Map.of("email", email, "code", code, "newPassword", newPassword));
    }

    private ResultActions login(String username, String password) throws Exception {
        return postJson("/api/v1/auth/login", Map.of("username", username, "password", password));
    }

    private ResultActions me(String accessToken) throws Exception {
        return mockMvc.perform(get("/api/v1/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken));
    }

    private String accessToken(ResultActions result) throws Exception {
        return objectMapper.readTree(result.andReturn().getResponse().getContentAsString()).path("accessToken").asText();
    }

    private ResultActions postJson(String path, Map<String, ?> body) throws Exception {
        return mockMvc.perform(post(path).contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)));
    }
}
