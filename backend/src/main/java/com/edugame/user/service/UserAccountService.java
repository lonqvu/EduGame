package com.edugame.user.service;

import java.time.Instant;
import java.util.Optional;

import com.edugame.common.exception.ResourceNotFoundException;
import com.edugame.user.domain.User;
import com.edugame.user.domain.UserStatus;
import com.edugame.user.dto.UserAccount;
import com.edugame.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsPasswordService;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Accounts for Spring Security: lookup at sign-in, re-hashing of outdated password hashes and the sign-in time.
 * <p>
 * A {@code DELETED} account is reported as not found, so it can neither sign in nor be told apart from an
 * unknown username.
 */
@Service
@RequiredArgsConstructor
public class UserAccountService implements UserDetailsService, UserDetailsPasswordService {

    private final UserRepository userRepository;

    /** @param login username, or email (any letter case) when it contains {@code @} */
    @Override
    @Transactional(readOnly = true)
    public UserAccount loadUserByUsername(String login) {
        String trimmed = login.trim();
        Optional<User> found = trimmed.contains("@")
                ? userRepository.findByEmailIgnoreCase(trimmed)
                : userRepository.findByUsername(trimmed);
        return found
                .filter(user -> user.getStatus() != UserStatus.DELETED)
                .map(UserAccountService::toAccount)
                .orElseThrow(() -> new UsernameNotFoundException("Unknown user"));
    }

    /** Active account by {@code users.code}; empty when unknown, locked or deleted. */
    @Transactional(readOnly = true)
    public Optional<UserAccount> findActiveByCode(String code) {
        return userRepository.findByCode(code)
                .filter(user -> user.getStatus() == UserStatus.ACTIVE)
                .map(UserAccountService::toAccount);
    }

    /** Active account by {@code users.id}; empty when unknown, locked or deleted. */
    @Transactional(readOnly = true)
    public Optional<UserAccount> findActiveById(Long id) {
        return userRepository.findById(id)
                .filter(user -> user.getStatus() == UserStatus.ACTIVE)
                .map(UserAccountService::toAccount);
    }

    /**
     * Called by Spring Security after a successful sign-in whose stored hash uses an outdated encoder (for example
     * the {@code {noop}} passwords of the dev seed): stores the new hash.
     */
    @Override
    @Transactional
    public UserAccount updatePassword(UserDetails account, String newPasswordHash) {
        User user = userRepository.findByUsername(account.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("User", account.getUsername()));
        user.setPasswordHash(newPasswordHash);
        return toAccount(user);
    }

    /** Active account by email (any letter case); empty when unknown, locked or deleted. */
    @Transactional(readOnly = true)
    public Optional<UserAccount> findActiveByEmail(String email) {
        return userRepository.findByEmailIgnoreCase(email)
                .filter(user -> user.getStatus() == UserStatus.ACTIVE)
                .map(UserAccountService::toAccount);
    }

    /**
     * Sets a new password after the owner proved the email address. Also marks the address verified, since the
     * code reached it.
     */
    @Transactional
    public UserAccount resetPassword(String code, String newPasswordHash) {
        User user = userRepository.findByCode(code).orElseThrow(() -> new ResourceNotFoundException("User", code));
        user.setPasswordHash(newPasswordHash);
        if (user.getEmailVerifiedAt() == null) {
            user.setEmailVerifiedAt(Instant.now());
        }
        return toAccount(user);
    }

    @Transactional
    public void recordLogin(String code) {
        userRepository.findByCode(code).ifPresent(user -> user.setLastLoginAt(Instant.now()));
    }

    static UserAccount toAccount(User user) {
        return new UserAccount(user.getId(), user.getCode(), user.getUsername(), user.getPasswordHash(),
                user.getRole(), user.getStatus());
    }
}
