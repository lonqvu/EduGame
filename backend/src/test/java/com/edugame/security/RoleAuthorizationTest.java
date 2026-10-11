package com.edugame.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import com.edugame.auth.service.AccessTokenService;
import com.edugame.auth.service.UserSessionService;
import com.edugame.user.domain.UserRole;
import com.edugame.user.domain.UserStatus;
import com.edugame.user.dto.UserAccount;
import com.edugame.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** {@code @PreAuthorize} role checks are enforced and answer 403 {@code FORBIDDEN} as an {@code ApiError}. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@Import(RoleAuthorizationTest.AdminOnlyController.class)
@Transactional
class RoleAuthorizationTest {

    private static final String ADMIN_ONLY = "/api/v1/test/admin-only";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AccessTokenService accessTokenService;

    @Autowired
    private UserSessionService userSessionService;

    @Autowired
    private UserRepository userRepository;

    @Test
    void adminPasses() throws Exception {
        mockMvc.perform(get(ADMIN_ONLY).header(HttpHeaders.AUTHORIZATION, bearer(UserRole.ADMIN)))
                .andExpect(status().isOk());
    }

    @Test
    void teacherIsForbidden() throws Exception {
        mockMvc.perform(get(ADMIN_ONLY).header(HttpHeaders.AUTHORIZATION, bearer(UserRole.TEACHER)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"))
                .andExpect(jsonPath("$.path").value(ADMIN_ONLY));
    }

    @Test
    void devDefaultUserKeepsItsTeacherRole() throws Exception {
        mockMvc.perform(get(ADMIN_ONLY))
                .andExpect(status().isForbidden());
    }

    /** Token of a real sign-in session of Cô Lan, carrying the given role. */
    private String bearer(UserRole role) {
        Long lanId = userRepository.findByCode("u-lan").orElseThrow().getId();
        UserAccount account = new UserAccount(lanId, "u-lan", "colan", null, role, UserStatus.ACTIVE);
        UUID sid = userSessionService.open(account, false, "test").sid();
        return "Bearer " + accessTokenService.issue(account, sid).accessToken();
    }

    @TestConfiguration
    @RestController
    static class AdminOnlyController {

        @PreAuthorize("hasRole('ADMIN')")
        @GetMapping(ADMIN_ONLY)
        String adminOnly() {
            return "ok";
        }
    }
}
