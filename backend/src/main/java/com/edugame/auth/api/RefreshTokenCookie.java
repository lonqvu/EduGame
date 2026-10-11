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
    String issue(String refreshToken, boolean remember) {
        ResponseCookie.ResponseCookieBuilder cookie = base(refreshToken);
        if (remember) {
            cookie.maxAge(properties().rememberTtl());
        }
        return cookie.build().toString();
    }

    String clear() {
        return base("").maxAge(0).build().toString();
    }

    private ResponseCookie.ResponseCookieBuilder base(String value) {
        return ResponseCookie.from(properties().cookieName(), value)
                .httpOnly(true)
                .secure(properties().cookieSecure())
                .sameSite("Strict")
                .path(PATH);
    }

    private AppProperties.Refresh properties() {
        return appProperties.auth().refresh();
    }
}
