package com.edugame.auth.service;

import java.util.Locale;

import com.edugame.auth.domain.VerificationPurpose;
import com.edugame.auth.dto.CodeSentResponse;
import com.edugame.auth.dto.RegisterRequest;
import com.edugame.auth.dto.ResendCodeRequest;
import com.edugame.auth.dto.VerifyEmailRequest;
import com.edugame.common.exception.BusinessException;
import com.edugame.user.dto.UserAccount;
import com.edugame.user.service.UserRegistrationService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Teacher sign-up, open to anyone with an email address:
 * <ol>
 *   <li>{@link #register}: the account to create is kept with a 6-digit code, which is mailed. No user yet.</li>
 *   <li>{@link #verify}: the right code creates the teacher and signs them in.</li>
 * </ol>
 * The answers never tell whether an address already has an account: its owner gets a mail saying so instead.
 */
@Service
@RequiredArgsConstructor
public class RegistrationService {

    private static final String DISPLAY_NAME = "displayName";
    private static final String PASSWORD_HASH = "passwordHash";

    private final EmailVerificationService verificationService;
    private final UserRegistrationService userRegistrationService;
    private final AuthService authService;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;

    public CodeSentResponse register(RegisterRequest request) {
        String email = normalize(request.email());
        // Always hash, so both branches take the same time.
        String passwordHash = passwordEncoder.encode(request.password());
        EmailVerificationService.Sent sent;
        if (userRegistrationService.emailInUse(email)) {
            sent = verificationService.sendAccountExists(email);
        } else {
            ObjectNode payload = objectMapper.createObjectNode()
                    .put(DISPLAY_NAME, request.displayName().strip())
                    .put(PASSWORD_HASH, passwordHash);
            sent = verificationService.sendCode(email, VerificationPurpose.REGISTER, payload);
        }
        return response(email, sent);
    }

    /** A new code for a pending sign-up; silently nothing when there is none (same answer either way). */
    public CodeSentResponse resend(ResendCodeRequest request) {
        String email = normalize(request.email());
        EmailVerificationService.Sent sent = verificationService.pendingPayload(email, VerificationPurpose.REGISTER)
                .map(payload -> verificationService.sendCode(email, VerificationPurpose.REGISTER, payload))
                .orElseGet(verificationService::sent);
        return response(email, sent);
    }

    /**
     * Creates the teacher once the code matches, then signs them in.
     *
     * @throws BusinessException 400 {@code INVALID_CODE} (wrong, attempts left), 400 {@code CODE_EXPIRED}
     *                           (expired, used, too many guesses: ask for a new one), 409 {@code EMAIL_TAKEN}
     */
    public AuthService.SignedIn verify(VerifyEmailRequest request, String userAgent) {
        String email = normalize(request.email());
        EmailVerificationService.Checked checked =
                verificationService.check(email, VerificationPurpose.REGISTER, request.code());
        switch (checked.outcome()) {
            case WRONG_CODE -> throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_CODE",
                    "Wrong code, %d attempts left".formatted(checked.attemptsLeft()));
            case EXPIRED -> throw new BusinessException(HttpStatus.BAD_REQUEST, "CODE_EXPIRED",
                    "Code expired or used up, ask for a new one");
            case VERIFIED -> {
                // Signs in below.
            }
        }
        JsonNode payload = checked.payload();
        UserAccount account = userRegistrationService.createVerifiedTeacher(email,
                payload.path(DISPLAY_NAME).asText(), payload.path(PASSWORD_HASH).asText());
        return authService.signIn(account, request.rememberMe(), userAgent);
    }

    private static CodeSentResponse response(String email, EmailVerificationService.Sent sent) {
        return new CodeSentResponse(email, sent.codeTtl().toSeconds(), sent.resendAfter().toSeconds());
    }

    private static String normalize(String email) {
        return email.strip().toLowerCase(Locale.ROOT);
    }
}
