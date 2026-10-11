package com.edugame.security;

import java.io.IOException;
import java.time.Instant;
import java.util.List;

import com.edugame.common.exception.ApiError;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.security.oauth2.server.resource.web.BearerTokenAuthenticationEntryPoint;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

/**
 * Answers requests the security filters reject with the usual {@link ApiError} body, so the frontend handles them
 * like any other error:
 * <ul>
 *   <li>401 {@code UNAUTHENTICATED}: no access token</li>
 *   <li>401 {@code INVALID_TOKEN}: malformed, wrongly signed or expired access token</li>
 *   <li>403 {@code FORBIDDEN}: signed in, but the role does not allow it</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
class SecurityErrorHandler implements AuthenticationEntryPoint, AccessDeniedHandler {

    /** Sets the 401 status and the standard {@code WWW-Authenticate: Bearer ...} header. */
    private final BearerTokenAuthenticationEntryPoint bearerEntryPoint = new BearerTokenAuthenticationEntryPoint();
    private final ObjectMapper objectMapper;

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException exception) throws IOException {
        bearerEntryPoint.commence(request, response, exception);
        if (exception instanceof InvalidBearerTokenException) {
            write(request, response, HttpStatus.UNAUTHORIZED, "INVALID_TOKEN", "Invalid or expired access token");
        } else {
            write(request, response, HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Not signed in");
        }
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
                       AccessDeniedException exception) throws IOException {
        write(request, response, HttpStatus.FORBIDDEN, "FORBIDDEN", "Not allowed");
    }

    private void write(HttpServletRequest request, HttpServletResponse response, HttpStatus status, String code,
                       String message) throws IOException {
        ApiError body = new ApiError(Instant.now(), status.value(), code, message, request.getRequestURI(),
                List.of());
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getOutputStream(), body);
    }
}
