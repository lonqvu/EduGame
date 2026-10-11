package com.edugame.user.service;

import com.edugame.common.exception.BusinessException;
import com.edugame.user.domain.User;
import com.edugame.user.domain.UserStatus;
import com.edugame.user.dto.UserResponse;
import com.edugame.user.mapper.UserMapper;
import com.edugame.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Who is making the request.
 * <p>
 * The name of the Spring Security authentication is the user's {@code users.code}: the {@code sub} of the access
 * token, or the configured default user in development. The account is re-read on every call, so a locked or
 * deleted user loses access immediately, even with a token that has not expired yet.
 */
@Service
@RequiredArgsConstructor
public class CurrentUserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;

    /** For other modules that need the entity (owner, created_by...). */
    @Transactional(readOnly = true)
    public User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            throw unauthenticated();
        }
        return userRepository.findByCode(authentication.getName())
                .filter(user -> user.getStatus() == UserStatus.ACTIVE)
                .orElseThrow(CurrentUserService::unauthenticated);
    }

    @Transactional(readOnly = true)
    public UserResponse getMe() {
        return userMapper.toResponse(getCurrentUser());
    }

    private static BusinessException unauthenticated() {
        return new BusinessException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Not signed in");
    }
}
