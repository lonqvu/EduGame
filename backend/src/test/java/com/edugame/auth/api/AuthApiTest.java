package com.edugame.auth.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;

import com.edugame.user.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

/**
 * Sign-in and access tokens end to end, against the seeded teacher Cô Lan ({@code colan} / {@code 123456}).
 * The default user is switched off, so requests without a token are anonymous as in production. Every test is
 * rolled back.
 */
@SpringBootTest(properties = "app.auth.default-user-code=")
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@Transactional
class AuthApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Test
    void signedInTeacherReachesHerData() throws Exception {
        String token = login("colan", "123456")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresIn").value(900))
                .andReturn().getResponse().getContentAsString();
        String accessToken = objectMapper.readTree(token).path("accessToken").asText();

        mockMvc.perform(get("/api/v1/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("u-lan"))
                .andExpect(jsonPath("$.displayName").value("Cô Lan"));
    }

    @Test
    void signInRecordsTheTimeAndUpgradesTheSeedPasswordToBcrypt() throws Exception {
        login("colan", "123456").andExpect(status().isOk());

        var user = userRepository.findByCode("u-lan").orElseThrow();
        assertThat(user.getPasswordHash()).startsWith("{bcrypt}");
        assertThat(user.getLastLoginAt()).isNotNull();

        login("colan", "123456").andExpect(status().isOk());
    }

    @Test
    void emailWorksAsLoginInAnyLetterCase() throws Exception {
        login(" Colan@EduGame.local ", "123456").andExpect(status().isOk());
        login("nobody@edugame.local", "123456")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void wrongPasswordAndUnknownUserGetTheSameAnswer() throws Exception {
        login("colan", "wrong")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
        login("nobody", "123456")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void blankCredentialsAreRejected() throws Exception {
        login("", "")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    @Test
    void requestWithoutTokenIsUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/v1/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"))
                .andExpect(jsonPath("$.path").value("/api/v1/me"));
    }

    @Test
    void forgedTokenIsRejected() throws Exception {
        mockMvc.perform(get("/api/v1/me").header(HttpHeaders.AUTHORIZATION, "Bearer not.a.token"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().exists(HttpHeaders.WWW_AUTHENTICATE))
                .andExpect(jsonPath("$.code").value("INVALID_TOKEN"));
    }

    @Test
    void templateCatalogueIsPublic() throws Exception {
        mockMvc.perform(get("/api/v1/game-templates")).andExpect(status().isOk());
    }

    private ResultActions login(String username, String password) throws Exception {
        String body = objectMapper.writeValueAsString(
                Map.of("username", username, "password", password));
        return mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(body));
    }
}
