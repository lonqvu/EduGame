package com.edugame.auth.service;

import java.util.Locale;

import com.edugame.auth.domain.SessionRevokeReason;
import com.edugame.auth.domain.VerificationPurpose;
import com.edugame.auth.dto.CodeSentResponse;
import com.edugame.auth.dto.ResendCodeRequest;
import com.edugame.auth.dto.ResetPasswordRequest;
import com.edugame.common.exception.BusinessException;
import com.edugame.user.dto.UserAccount;
import com.edugame.user.service.UserAccountService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * "Quên mật khẩu":
 * <ol>
 *   <li>{@link #requestCode}: a 6-digit code is mailed to the address if it belongs to an active account.</li>
 *   <li>{@link #reset}: the right code sets the new password, ends every existing session of the account (whoever
 *       knew the old password is signed out) and signs the user in.</li>
 * </ol>
 * The answer to step 1 is the same whether or not the address has an account.
 */
@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private static final String USER_CODE = "userCode";

    private final EmailVerificationService verificationService;
    private final UserAccountService userAccountService;
    private final UserSessionService userSessionService;
    private final AuthService authService;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;

    /** Also used to get a new code: the newest one replaces the earlier ones. */
    public CodeSentResponse requestCode(ResendCodeRequest request) {
        String email = request.email().toLowerCase(Locale.ROOT);
        EmailVerificationService.Sent sent = userAccountService.findActiveByEmail(email)
                .map(account -> verificationService.sendCode(email, VerificationPurpose.RESET_PASSWORD,
                        objectMapper.createObjectNode().put(USER_CODE, account.code())))
                .orElseGet(() -> verificationService.recordWithoutMail(email, VerificationPurpose.RESET_PASSWORD));
        return new CodeSentResponse(email, sent.codeTtl().toSeconds(), sent.resendAfter().toSeconds());
    }

    /**
     * @throws BusinessException 400 {@code INVALID_CODE} (wrong, attempts left) or {@code CODE_EXPIRED} (expired,
     *                           used, too many guesses, account no longer active)
     */
    public AuthService.SignedIn reset(ResetPasswordRequest request, String userAgent) {
        String email = request.email().toLowerCase(Locale.ROOT);
        EmailVerificationService.Checked checked =
                verificationService.check(email, VerificationPurpose.RESET_PASSWORD, request.code());
        switch (checked.outcome()) {
            case WRONG_CODE -> throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_CODE",
                    "Wrong code, %d attempts left".formatted(checked.attemptsLeft()));
            case EXPIRED -> throw codeExpired();
            case VERIFIED -> {
                // Resets below.
            }
        }
        String userCode = checked.payload().path(USER_CODE).asText();
        UserAccount account = userAccountService.findActiveByEmail(email)
                .filter(found -> found.code().equals(userCode))
                .orElseThrow(PasswordResetService::codeExpired);

        UserAccount updated = userAccountService.resetPassword(account.code(),
                passwordEncoder.encode(request.newPassword()));
        userSessionService.revokeAllOfUser(updated.id(), SessionRevokeReason.PASSWORD_RESET);
        return authService.signIn(updated, false, userAgent);
    }

    private static BusinessException codeExpired() {
        return new BusinessException(HttpStatus.BAD_REQUEST, "CODE_EXPIRED", "Code expired or used up, ask for a new one");
    }
}
