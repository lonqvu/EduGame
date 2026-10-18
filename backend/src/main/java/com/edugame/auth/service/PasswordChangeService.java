package com.edugame.auth.service;

import java.util.UUID;

import com.edugame.auth.domain.SessionRevokeReason;
import com.edugame.common.exception.BusinessException;
import com.edugame.user.domain.User;
import com.edugame.user.dto.ChangePasswordRequest;
import com.edugame.user.service.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * "Bảo mật tài khoản" of the profile: a new password, and signing out of the other devices. The session the request
 * comes from stays signed in; every other one ends at once (its access tokens included, see SessionTokenValidator).
 */
@Service
@RequiredArgsConstructor
public class PasswordChangeService {

    private final CurrentUserService currentUserService;
    private final PasswordEncoder passwordEncoder;
    private final UserSessionService userSessionService;
    private final SignInAlerts signInAlerts;

    /**
     * Sets a new password once the current one is right; returns how many other sessions ended.
     *
     * @param currentSid the session making the request; {@code null} (no token, development) ends them all
     */
    @Transactional
    public int change(ChangePasswordRequest request, UUID currentSid) {
        User user = currentUserService.getCurrentUser();
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            // Not 401: the teacher is signed in, only the password typed is wrong.
            throw new BusinessException(HttpStatus.BAD_REQUEST, "WRONG_PASSWORD", "The current password is wrong");
        }
        if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "SAME_PASSWORD", "The new password is the current one");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        signInAlerts.passwordChanged(user.getId());
        return userSessionService.revokeOthers(user.getId(), currentSid, SessionRevokeReason.PASSWORD_CHANGE);
    }

    /** Ends every session of the teacher but {@code currentSid}; returns how many ended. */
    @Transactional
    public int signOutElsewhere(UUID currentSid) {
        User user = currentUserService.getCurrentUser();
        return userSessionService.revokeOthers(user.getId(), currentSid, SessionRevokeReason.SIGNED_OUT_ELSEWHERE);
    }
}
