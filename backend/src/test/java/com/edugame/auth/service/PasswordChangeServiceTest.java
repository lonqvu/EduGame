package com.edugame.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.UUID;

import com.edugame.auth.domain.SessionRevokeReason;
import com.edugame.common.exception.BusinessException;
import com.edugame.user.domain.User;
import com.edugame.user.dto.ChangePasswordRequest;
import com.edugame.user.service.CurrentUserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

/** A new password needs the current one; the session it is changed in stays, the others end. */
class PasswordChangeServiceTest {

    private static final UUID CURRENT_SESSION = UUID.randomUUID();

    private final PasswordEncoder passwordEncoder = PasswordEncoderFactories.createDelegatingPasswordEncoder();
    private final CurrentUserService currentUserService = mock(CurrentUserService.class);
    private final UserSessionService sessions = mock(UserSessionService.class);
    private final SignInAlerts alerts = mock(SignInAlerts.class);
    private final PasswordChangeService service =
            new PasswordChangeService(currentUserService, passwordEncoder, sessions, alerts);

    private User teacher;

    @BeforeEach
    void signIn() {
        teacher = User.verifiedTeacher("u-long", "long", passwordEncoder.encode("matkhau-cu"), "Vũ Long",
                "long@example.com", Instant.now());
        ReflectionTestUtils.setField(teacher, "id", 7L);
        when(currentUserService.getCurrentUser()).thenReturn(teacher);
        when(sessions.revokeOthers(anyLong(), any(), any())).thenReturn(2);
    }

    @Test
    void setsTheNewPasswordAndEndsTheOtherSessions() {
        int ended = service.change(new ChangePasswordRequest("matkhau-cu", "matkhau-moi"), CURRENT_SESSION);

        assertThat(ended).isEqualTo(2);
        assertThat(passwordEncoder.matches("matkhau-moi", teacher.getPasswordHash())).isTrue();
        assertThat(teacher.getPasswordHash()).startsWith("{bcrypt}");
        verify(sessions).revokeOthers(7L, CURRENT_SESSION, SessionRevokeReason.PASSWORD_CHANGE);
    }

    @Test
    void aWrongCurrentPasswordChangesNothing() {
        String before = teacher.getPasswordHash();

        assertThatThrownBy(() -> service.change(new ChangePasswordRequest("doan-sai", "matkhau-moi"), CURRENT_SESSION))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("code", "WRONG_PASSWORD");

        assertThat(teacher.getPasswordHash()).isEqualTo(before);
        verify(sessions, never()).revokeOthers(anyLong(), any(), any());
    }

    @Test
    void theNewPasswordMustDiffer() {
        assertThatThrownBy(() -> service.change(new ChangePasswordRequest("matkhau-cu", "matkhau-cu"), CURRENT_SESSION))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("code", "SAME_PASSWORD");
        verify(sessions, never()).revokeOthers(anyLong(), any(), any());
    }

    @Test
    void signsOutTheOtherDevicesOnly() {
        assertThat(service.signOutElsewhere(CURRENT_SESSION)).isEqualTo(2);
        verify(sessions).revokeOthers(7L, CURRENT_SESSION, SessionRevokeReason.SIGNED_OUT_ELSEWHERE);
    }
}
