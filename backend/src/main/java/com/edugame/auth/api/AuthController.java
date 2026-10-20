package com.edugame.auth.api;

import com.edugame.auth.dto.CodeSentResponse;
import com.edugame.auth.dto.LoginRequest;
import com.edugame.auth.dto.RegisterRequest;
import com.edugame.auth.dto.ResendCodeRequest;
import com.edugame.auth.dto.ResetPasswordRequest;
import com.edugame.auth.dto.TokenResponse;
import com.edugame.auth.dto.VerifyEmailRequest;
import com.edugame.auth.service.AuthService;
import com.edugame.auth.service.PasswordResetService;
import com.edugame.auth.service.RegistrationService;
import com.edugame.common.exception.BusinessException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Sign-in. The access token travels in the response body (the frontend keeps it in memory); the refresh token
 * only ever in the HttpOnly cookie ({@link RefreshTokenCookie}).
 */
@Tag(name = "Auth", description = "Sign-in, token refresh, sign-out, sign-up, password reset")
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final RegistrationService registrationService;
    private final PasswordResetService passwordResetService;
    private final RefreshTokenCookie refreshTokenCookie;

    @Operation(summary = "Sign in with username (or email) and password",
            description = "Returns an access token and sets the refresh token cookie. 401 INVALID_CREDENTIALS; "
                    + "429 TOO_MANY_LOGIN_ATTEMPTS after too many failures for the username or the address.")
    @SecurityRequirements
    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(@Valid @RequestBody LoginRequest request,
                                               @RequestHeader(value = HttpHeaders.USER_AGENT, required = false)
                                               String userAgent, HttpServletRequest servletRequest) {
        return withCookie(authService.login(request, userAgent, servletRequest.getRemoteAddr()), servletRequest);
    }

    @Operation(summary = "New access token from the refresh token cookie",
            description = "Rotates the refresh token. 401 INVALID_REFRESH_TOKEN (and the cookie is cleared) when "
                    + "the session is missing, expired or revoked.")
    @SecurityRequirements
    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(HttpServletRequest request, HttpServletResponse response) {
        try {
            return withCookie(authService.refresh(refreshTokenCookie.read(request)), request);
        } catch (BusinessException ex) {
            // Kept on the error response written by GlobalExceptionHandler.
            response.addHeader(HttpHeaders.SET_COOKIE, refreshTokenCookie.clear(request));
            throw ex;
        }
    }

    @Operation(summary = "Sign out: ends the session of the refresh token cookie and clears it",
            description = "Access tokens of that session stop working at once. Always 204.")
    @SecurityRequirements
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        authService.logout(refreshTokenCookie.read(request));
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, refreshTokenCookie.clear(request)).build();
    }

    @Operation(summary = "Sign up: mails a 6-digit code to confirm the address",
            description = "No account is created yet. Same 202 answer whether or not the address already has an "
                    + "account (its owner is told by mail). 429 RESEND_TOO_SOON / TOO_MANY_CODES.")
    @SecurityRequirements
    @PostMapping("/register")
    public ResponseEntity<CodeSentResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.accepted().body(registrationService.register(request));
    }

    @Operation(summary = "Mails a new code for a pending sign-up")
    @SecurityRequirements
    @PostMapping("/register/resend")
    public ResponseEntity<CodeSentResponse> resendCode(@Valid @RequestBody ResendCodeRequest request) {
        return ResponseEntity.accepted().body(registrationService.resend(request));
    }

    @Operation(summary = "Confirms the address with the code: creates the teacher and signs them in",
            description = "Same answer as login. 400 INVALID_CODE / CODE_EXPIRED, 409 EMAIL_TAKEN.")
    @SecurityRequirements
    @PostMapping("/register/verify")
    public ResponseEntity<TokenResponse> verify(@Valid @RequestBody VerifyEmailRequest request,
                                                @RequestHeader(value = HttpHeaders.USER_AGENT, required = false)
                                                String userAgent, HttpServletRequest servletRequest) {
        return withCookie(registrationService.verify(request, userAgent), servletRequest);
    }

    @Operation(summary = "Forgotten password: mails a 6-digit code (also to get a new one)",
            description = "Same 202 answer whether or not the address has an active account; only then is a mail "
                    + "sent. 429 RESEND_TOO_SOON / TOO_MANY_CODES.")
    @SecurityRequirements
    @PostMapping("/password/forgot")
    public ResponseEntity<CodeSentResponse> forgotPassword(@Valid @RequestBody ResendCodeRequest request) {
        return ResponseEntity.accepted().body(passwordResetService.requestCode(request));
    }

    @Operation(summary = "Sets a new password with the mailed code and signs in",
            description = "Ends every other session of the account. Same answer as login. "
                    + "400 INVALID_CODE / CODE_EXPIRED.")
    @SecurityRequirements
    @PostMapping("/password/reset")
    public ResponseEntity<TokenResponse> resetPassword(@Valid @RequestBody ResetPasswordRequest request,
                                                       @RequestHeader(value = HttpHeaders.USER_AGENT, required = false)
                                                       String userAgent, HttpServletRequest servletRequest) {
        return withCookie(passwordResetService.reset(request, userAgent), servletRequest);
    }

    private ResponseEntity<TokenResponse> withCookie(AuthService.SignedIn signedIn, HttpServletRequest request) {
        ResponseEntity.BodyBuilder response = ResponseEntity.ok();
        if (signedIn.refreshToken() != null) {
            response.header(HttpHeaders.SET_COOKIE,
                    refreshTokenCookie.issue(signedIn.refreshToken(), signedIn.remember(), request));
        }
        return response.body(signedIn.accessToken());
    }
}
