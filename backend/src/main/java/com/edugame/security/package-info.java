/**
 * Module: security.
 * <p>
 * Cross-cutting security configuration: the filter chain and which endpoints are public ({@code SecurityConfig}),
 * access token signing and verification ({@code JwtConfig}), password encoding, and the {@code ApiError} answers
 * for 401 / 403.
 * <p>
 * Who the current user is: {@code com.edugame.user.service.CurrentUserService}. Sign-in: module {@code auth}.
 */
package com.edugame.security;
