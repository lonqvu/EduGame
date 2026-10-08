package com.edugame.user.service;

import com.edugame.common.config.AppProperties;
import com.edugame.common.exception.BusinessException;
import com.edugame.user.domain.User;
import com.edugame.user.domain.UserStatus;
import com.edugame.user.dto.UserResponse;
import com.edugame.user.mapper.UserMapper;
import com.edugame.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Who is making the request.
 * <p>
 * There is no login yet: the current user is the one configured in {@code app.auth.default-user-code}
 * (the seeded teacher in the dev profile). When the auth module lands, only this class changes.
 */
@Service
@RequiredArgsConstructor
public class CurrentUserService {

    private final AppProperties appProperties;
    private final UserRepository userRepository;
    private final UserMapper userMapper;

    /** For other modules that need the entity (owner, created_by...). */
    @Transactional(readOnly = true)
    public User getCurrentUser() {
        String code = appProperties.auth() == null ? null : appProperties.auth().defaultUserCode();
        if (code == null || code.isBlank()) {
            throw unauthenticated();
        }
        return userRepository.findByCode(code)
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
