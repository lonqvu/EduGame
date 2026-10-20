package com.edugame.auth.api;

import com.edugame.common.config.AppProperties;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;
import org.springframework.web.util.WebUtils;

/**
 * The refresh token cookie: {@code HttpOnly} (scripts cannot read it), {@code SameSite=Strict} (never sent by
 * other sites, which is what protects these cookie-authenticated endpoints from CSRF) and only sent to
 * {@code /api/v1/auth}.
 * <p>
 * {@code Secure} ({@code app.auth.refresh.cookie-secure}) is only set when the request came over HTTPS (or to
 * localhost, which browsers treat as secure). Browsers drop a {@code Secure} cookie set over plain HTTP, so a site
 * opened as {@code http://<server IP>} would otherwise lose the sign-in on every reload and after the 15 minutes of
 * an access token. Behind the reverse proxy the scheme comes from {@code X-Forwarded-Proto}
 * ({@code server.forward-headers-strategy: native}).
 */
@Component
@RequiredArgsConstructor
class RefreshTokenCookie {

    private static final String PATH = "/api/v1/auth";

    private final AppProperties appProperties;

    String read(HttpServletRequest request) {
        Cookie cookie = WebUtils.getCookie(request, properties().cookieName());
        return cookie == null || cookie.getValue().isBlank() ? null : cookie.getValue();
    }

    /** Persistent for "Ghi nhớ đăng nhập", otherwise gone when the browser closes. */
    String issue(String refreshToken, boolean remember, HttpServletRequest request) {
        ResponseCookie.ResponseCookieBuilder cookie = base(refreshToken, request);
        if (remember) {
            cookie.maxAge(properties().rememberTtl());
        }
        return cookie.build().toString();
    }

    String clear(HttpServletRequest request) {
        return base("", request).maxAge(0).build().toString();
    }

    private ResponseCookie.ResponseCookieBuilder base(String value, HttpServletRequest request) {
        return ResponseCookie.from(properties().cookieName(), value)
                .httpOnly(true)
                .secure(properties().cookieSecure() && (request.isSecure() || isLocalhost(request.getServerName())))
                .sameSite("Strict")
                .path(PATH);
    }

    private static boolean isLocalhost(String host) {
        return "localhost".equalsIgnoreCase(host) || "127.0.0.1".equals(host) || "[::1]".equals(host) || "::1".equals(host);
    }

    private AppProperties.Refresh properties() {
        return appProperties.auth().refresh();
    }
}
