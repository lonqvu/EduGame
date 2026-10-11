package com.edugame.security;

import java.io.IOException;

import com.edugame.user.service.UserAccountService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Development aid ({@code app.auth.default-user-code}): a request without an {@code Authorization} header acts as
 * that user. Requests with a token, valid or not, are left to the JWT filter.
 * <p>
 * Registered only when the property is set (the dev profile). Never set it in production.
 */
@RequiredArgsConstructor
class DefaultUserAuthenticationFilter extends OncePerRequestFilter {

    private final String defaultUserCode;
    private final UserAccountService userAccountService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (request.getHeader(HttpHeaders.AUTHORIZATION) == null
                && SecurityContextHolder.getContext().getAuthentication() == null) {
            userAccountService.findActiveByCode(defaultUserCode).ifPresent(account -> {
                SecurityContext context = SecurityContextHolder.createEmptyContext();
                context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
                        account.code(), null, account.getAuthorities()));
                SecurityContextHolder.setContext(context);
            });
        }
        chain.doFilter(request, response);
    }
}
