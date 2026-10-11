package com.edugame.user.dto;

import java.util.Collection;
import java.util.List;

import com.edugame.user.domain.UserRole;
import com.edugame.user.domain.UserStatus;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/**
 * A user as Spring Security sees it: credentials, role and whether the account may sign in.
 * <p>
 * Only for authentication. Never return it from an endpoint: it carries the password hash.
 *
 * @param id           {@code users.id}, referenced by sign-in sessions
 * @param code         {@code users.code}, the identity written into access tokens
 * @param passwordHash {@code users.password_hash}, prefixed with the encoder id ({@code {bcrypt}...})
 */
public record UserAccount(Long id, String code, String username, String passwordHash, UserRole role, UserStatus status)
        implements UserDetails {

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public boolean isAccountNonLocked() {
        return status != UserStatus.LOCKED;
    }

    @Override
    public boolean isEnabled() {
        return status != UserStatus.DELETED;
    }

    /** Keeps the password hash out of logs. */
    @Override
    public String toString() {
        return "UserAccount[code=%s, username=%s, role=%s, status=%s]".formatted(code, username, role, status);
    }
}
