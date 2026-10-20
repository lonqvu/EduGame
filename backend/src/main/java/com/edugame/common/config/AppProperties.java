package com.edugame.common.config;

import java.time.Duration;
import java.time.ZoneId;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Application-specific settings bound from the {@code app.*} namespace in application.yml.
 *
 * @param timeZone zone of the school, used for calendar boundaries such as "this week"
 */
@ConfigurationProperties(prefix = "app")
public record AppProperties(Cors cors, Auth auth, Mail mail, ZoneId timeZone) {

    public record Cors(List<String> allowedOrigins) {
    }

    /**
     * @param defaultUserCode development aid: {@code users.code} a request acts as when it carries no access
     *                        token; blank means such requests are anonymous
     */
    public record Auth(String defaultUserCode, Jwt jwt, Refresh refresh, Verification verification, Login login) {
    }

    /**
     * Failed sign-ins: a username (or email) with {@code maxFailures} failures, or a client address with
     * {@code maxFailuresPerIp}, within {@code window} is locked for {@code lockFor}.
     */
    public record Login(int maxFailures, int maxFailuresPerIp, Duration window, Duration lockFor) {
    }

    /**
     * One-time codes mailed to prove an email address belongs to the user.
     *
     * @param codeTtl         how long a code works
     * @param maxAttempts     wrong guesses before the code is void
     * @param resendCooldown  minimum time between two mails to the same address
     * @param maxSendsPerHour mails to the same address per hour, so the form cannot be used to spam someone
     */
    public record Verification(Duration codeTtl, int maxAttempts, Duration resendCooldown, int maxSendsPerHour) {
    }

    /**
     * @param from     sender of every mail, e.g. {@code Lớp vui <no-reply@edugame.vn>}
     * @param logCodes also write verification codes to the log (development only)
     */
    public record Mail(String from, boolean logCodes) {
    }

    /**
     * @param secret         HMAC-SHA256 signing key, at least 32 bytes
     * @param issuer         {@code iss} claim written into and required from every access token
     * @param accessTokenTtl lifetime of an access token
     */
    public record Jwt(String secret, String issuer, Duration accessTokenTtl) {
    }

    /**
     * Refresh token cookie and the sign-in session behind it. Both lifetimes are idle timeouts: every refresh
     * extends them.
     *
     * @param rememberTtl  "Ghi nhớ đăng nhập" ticked: persistent cookie, session lasts this long
     * @param sessionTtl   not ticked: cookie lives until the browser closes, session at most this long
     * @param reuseGrace   how long the token just replaced by a refresh is still accepted (two tabs refreshing
     *                     at the same time); after that, using it revokes the session
     * @param cookieName   name of the HttpOnly cookie
     * @param cookieSecure {@code Secure} flag; browsers accept it on http://localhost too
     */
    public record Refresh(Duration rememberTtl, Duration sessionTtl, Duration reuseGrace, String cookieName,
                          boolean cookieSecure) {
    }
}
