package com.edugame.auth.service;

import com.edugame.auth.dto.LoginRequest;
import com.edugame.auth.dto.TokenResponse;
import com.edugame.common.exception.BusinessException;
import com.edugame.common.validation.MaxUtf8BytesValidator;
import com.edugame.user.dto.UserAccount;
import com.edugame.user.service.UserAccountService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final AccessTokenService accessTokenService;
    private final UserSessionService userSessionService;
    private final UserAccountService userAccountService;
    private final LoginThrottle loginThrottle;

    /**
     * An access token for the response body and, when it changed, the refresh token for the cookie.
     *
     * @param refreshToken {@code null}: leave the cookie as it is
     */
    public record SignedIn(TokenResponse accessToken, String refreshToken, boolean remember) {
    }

    /**
     * Checks username and password, opens a sign-in session and issues its tokens.
     * <p>
     * Unknown user, wrong password, locked or deleted account all give the same 401 {@code INVALID_CREDENTIALS},
     * so the answer does not reveal which usernames exist. Too many failures lock the username and the client
     * address for a while: 429 {@code TOO_MANY_LOGIN_ATTEMPTS} ({@link LoginThrottle}).
     *
     * @param clientIp address of the browser, {@code null} if unknown
     */
    public SignedIn login(LoginRequest request, String userAgent, String clientIp) {
        loginThrottle.check(request.username(), clientIp);
        Authentication authentication;
        try {
            // Longer than BCrypt can read: no stored password can match (and the encoder would throw).
            if (MaxUtf8BytesValidator.utf8Length(request.password()) > LoginRequest.PASSWORD_MAX_BYTES) {
                throw new BadCredentialsException("Password over the BCrypt limit");
            }
            authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(request.username(), request.password()));
        } catch (AuthenticationException ex) {
            log.info("Sign-in failed for '{}': {}", request.username(), ex.getClass().getSimpleName());
            loginThrottle.recordFailure(request.username(), clientIp);
            throw new BusinessException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS",
                    "Wrong username or password");
        }
        loginThrottle.clear(request.username());
        return signIn((UserAccount) authentication.getPrincipal(), request.rememberMe(), userAgent);
    }

    /** Opens a sign-in session for an account whose identity has been proven (password, email code). */
    public SignedIn signIn(UserAccount account, boolean remember, String userAgent) {
        userAccountService.recordLogin(account.code());
        UserSessionService.OpenedSession session = userSessionService.open(account, remember, userAgent);
        return new SignedIn(accessTokenService.issue(account, session.sid()), session.refreshToken(), remember);
    }

    /** New access token (and rotated refresh token) for a valid refresh token; 401 otherwise. */
    public SignedIn refresh(String refreshToken) {
        UserSessionService.RefreshedSession session = userSessionService.refresh(refreshToken)
                .orElseThrow(() -> new BusinessException(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN",
                        "Sign-in session missing, expired or revoked"));
        return new SignedIn(accessTokenService.issue(session.account(), session.sid()), session.refreshToken(),
                session.remember());
    }

    /** Ends the session of this refresh token: its access tokens stop working at once. */
    public void logout(String refreshToken) {
        if (refreshToken != null) {
            userSessionService.revoke(refreshToken);
        }
    }
}
