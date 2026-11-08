package com.edugame.auth.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.Map;

import com.edugame.auth.service.GoogleIdTokenVerifier;
import com.edugame.auth.service.GoogleIdTokenVerifier.GoogleIdentity;
import com.edugame.common.exception.BusinessException;
import com.edugame.user.domain.User;
import com.edugame.user.domain.UserRole;
import com.edugame.user.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

/** "Đăng nhập với Google". Google is not called: the verifier is replaced by what a valid token would prove. */
@SpringBootTest(properties = "app.auth.default-user-code=")
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@Transactional
class GoogleSignInApiTest {

    private static final String EMAIL = "co.lan@gmail.com";
    private static final String SUB = "109876543210987654321";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockitoBean
    private GoogleIdTokenVerifier verifier;

    @Test
    void newGoogleUserBecomesATeacherWithoutPassword() throws Exception {
        googleSays(new GoogleIdentity(SUB, EMAIL, "Cô Lan"));

        String body = google("token")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(cookie().exists("edugame_refresh"))
                .andReturn().getResponse().getContentAsString();

        User user = userRepository.findByGoogleSub(SUB).orElseThrow();
        assertThat(user.getEmail()).isEqualTo(EMAIL);
        assertThat(user.getDisplayName()).isEqualTo("Cô Lan");
        assertThat(user.getUsername()).isEqualTo("co.lan");
        assertThat(user.getRole()).isEqualTo(UserRole.TEACHER);
        assertThat(user.getEmailVerifiedAt()).isNotNull();
        assertThat(user.getPasswordHash()).isNull();

        String accessToken = objectMapper.readTree(body).path("accessToken").asText();
        mockMvc.perform(get("/api/v1/me/profile").header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hasPassword").value(false))
                .andExpect(jsonPath("$.google").value(true));

        // No password: a password sign-in cannot match anything.
        postJson("/api/v1/auth/login", Map.of("username", EMAIL, "password", ""))
                .andExpect(status().isBadRequest());
        postJson("/api/v1/auth/login", Map.of("username", EMAIL, "password", "matkhau123"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));

        // The first password is set without a current one, then a password sign-in works.
        mockMvc.perform(post("/api/v1/me/password").header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("newPassword", "matkhau123"))))
                .andExpect(status().isOk());
        postJson("/api/v1/auth/login", Map.of("username", EMAIL, "password", "matkhau123"))
                .andExpect(status().isOk());
    }

    @Test
    void secondSignInUsesTheSameAccount() throws Exception {
        googleSays(new GoogleIdentity(SUB, EMAIL, "Cô Lan"));
        google("token").andExpect(status().isOk());
        long before = userRepository.count();

        google("token").andExpect(status().isOk());

        assertThat(userRepository.count()).isEqualTo(before);
    }

    @Test
    void accountWithTheSameEmailIsLinkedAndKeepsItsPassword() throws Exception {
        User existing = userRepository.saveAndFlush(User.verifiedTeacher("u-googletest1", "colan.gtest1",
                passwordEncoder.encode("matkhau123"), "Cô Lan", EMAIL, null));
        googleSays(new GoogleIdentity(SUB, EMAIL, "Lan Nguyen"));

        google("token").andExpect(status().isOk());

        User linked = userRepository.findById(existing.getId()).orElseThrow();
        assertThat(linked.getGoogleSub()).isEqualTo(SUB);
        assertThat(linked.getDisplayName()).as("the name at Google does not replace hers").isEqualTo("Cô Lan");
        assertThat(linked.getEmailVerifiedAt()).as("Google verified the address").isNotNull();
        postJson("/api/v1/auth/login", Map.of("username", EMAIL, "password", "matkhau123"))
                .andExpect(status().isOk());
    }

    @Test
    void emailLinkedToAnotherGoogleAccountIsRefused() throws Exception {
        User existing = User.verifiedTeacher("u-googletest2", "colan.gtest2", passwordEncoder.encode("matkhau123"),
                "Cô Lan", EMAIL, Instant.now());
        existing.linkGoogle("another-sub", Instant.now());
        userRepository.saveAndFlush(existing);
        googleSays(new GoogleIdentity(SUB, EMAIL, "Cô Lan"));

        google("token")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EMAIL_TAKEN"));
    }

    @Test
    void lockedAccountCannotSignIn() throws Exception {
        User existing = User.verifiedTeacher("u-googletest3", "colan.gtest3", passwordEncoder.encode("matkhau123"),
                "Cô Lan", EMAIL, Instant.now());
        existing.lock();
        userRepository.saveAndFlush(existing);
        googleSays(new GoogleIdentity(SUB, EMAIL, "Cô Lan"));

        google("token")
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCOUNT_DISABLED"))
                .andExpect(cookie().doesNotExist("edugame_refresh"));
        assertThat(userRepository.findByGoogleSub(SUB)).as("not linked").isEmpty();
    }

    @Test
    void invalidTokenIsRefused() throws Exception {
        when(verifier.verify(anyString())).thenThrow(new BusinessException(HttpStatus.UNAUTHORIZED,
                "INVALID_GOOGLE_TOKEN", "Google sign-in could not be verified"));

        google("forged")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_GOOGLE_TOKEN"));
    }

    @Test
    void credentialIsRequired() throws Exception {
        postJson("/api/v1/auth/google", Map.of("credential", " ")).andExpect(status().isBadRequest());
    }

    private void googleSays(GoogleIdentity identity) {
        when(verifier.verify(anyString())).thenReturn(identity);
    }

    private ResultActions google(String credential) throws Exception {
        return postJson("/api/v1/auth/google", Map.of("credential", credential, "remember", true));
    }

    private ResultActions postJson(String path, Map<String, ?> body) throws Exception {
        return mockMvc.perform(post(path).contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)));
    }
}
