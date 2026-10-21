package com.edugame.admin.service;

import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.edugame.admin.domain.AdminAction;
import com.edugame.admin.domain.AdminTargetType;
import com.edugame.admin.dto.AdminTeacherPage;
import com.edugame.admin.dto.AdminTeacherResponse;
import com.edugame.admin.dto.AdminTeacherSummaryResponse;
import com.edugame.admin.repository.AdminQueries;
import com.edugame.auth.domain.SessionRevokeReason;
import com.edugame.auth.service.LoginThrottle;
import com.edugame.auth.service.UserSessionService;
import com.edugame.common.exception.BusinessException;
import com.edugame.common.exception.ResourceNotFoundException;
import com.edugame.user.domain.User;
import com.edugame.user.domain.UserRole;
import com.edugame.user.domain.UserStatus;
import com.edugame.user.repository.UserRepository;
import com.edugame.user.service.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * "Giáo viên" for admins: the accounts, and what an admin may do to one. Every change is written to the admin log.
 * An admin never changes their own account here (they could lock themselves out), and an admin account must lose
 * the role before it can be locked.
 */
@Service
@RequiredArgsConstructor
public class AdminTeacherService {

    public static final int MAX_PAGE_SIZE = 100;
    private static final Duration RECENT = Duration.ofDays(30);

    private final AdminQueries queries;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final UserSessionService userSessionService;
    private final LoginThrottle loginThrottle;
    private final AdminAuditService auditService;

    /**
     * @param search   part of the name, username or email; blank: all
     * @param statuses empty: active and locked (deleted accounts only when asked for)
     * @param roles    empty: every role
     */
    @Transactional(readOnly = true)
    public AdminTeacherPage list(String search, Collection<UserStatus> statuses, Collection<UserRole> roles,
                                 AdminQueries.TeacherSort sort, int page, int size) {
        Collection<UserStatus> wantedStatuses = statuses == null || statuses.isEmpty()
                ? EnumSet.of(UserStatus.ACTIVE, UserStatus.LOCKED) : statuses;
        Collection<UserRole> wantedRoles = roles == null || roles.isEmpty() ? EnumSet.allOf(UserRole.class) : roles;
        String query = search == null || search.isBlank() ? null : search.strip();
        AdminQueries.TeacherPage found = queries.teachers(query, names(wantedStatuses), names(wantedRoles),
                sort == null ? AdminQueries.TeacherSort.NEWEST : sort, Math.max(0, page),
                Math.clamp(size, 1, MAX_PAGE_SIZE));
        return new AdminTeacherPage(found.rows().stream().map(AdminTeacherService::summary).toList(), found.total());
    }

    @Transactional(readOnly = true)
    public AdminTeacherResponse get(String code) {
        AdminQueries.TeacherRow row = queries.teacher(code).orElseThrow(() -> notFound(code));
        Instant now = Instant.now();
        AdminQueries.TeacherFigures figures = queries.figures(row.id(), now.minus(RECENT), now);
        Instant blockedUntil = loginThrottle.lockedUntil(row.username(), row.email()).orElse(null);
        List<AdminTeacherResponse.Device> devices = queries.devices(row.id()).stream()
                .map(d -> new AdminTeacherResponse.Device(d.device(), d.firstSeenAt(), d.lastSeenAt()))
                .toList();
        boolean self = row.code().equals(currentUserService.getCurrentUser().getCode());
        return new AdminTeacherResponse(row.code(), row.displayName(), row.username(), row.email(), row.phone(),
                UserRole.valueOf(row.role()), UserStatus.valueOf(row.status()), row.emailVerifiedAt() != null,
                row.createdAt(), row.lastActiveAt(),
                new AdminTeacherResponse.Figures(row.classrooms(), figures.students(), row.games(),
                        figures.questionSets(), figures.plays(), figures.recentPlays()),
                figures.openSessions(), blockedUntil, devices, self,
                auditService.historyOf(AdminTargetType.TEACHER, row.code()));
    }

    /** The teacher can no longer sign in, and is signed out everywhere at once. Locking a locked account does nothing. */
    @Transactional
    public AdminTeacherResponse lock(String code, String reason) {
        User user = changeable(code);
        if (user.getRole() == UserRole.ADMIN) {
            throw new BusinessException(HttpStatus.CONFLICT, "ADMIN_CANNOT_BE_LOCKED",
                    "Take the admin role away before locking the account");
        }
        if (user.getStatus() != UserStatus.LOCKED) {
            user.lock();
            int ended = userSessionService.revokeAllOfUser(user.getId(), SessionRevokeReason.USER_INACTIVE);
            auditService.record(AdminAction.TEACHER_LOCKED, AdminTargetType.TEACHER, user.getCode(), label(user),
                    details("reason", reason, "sessionsEnded", ended));
        }
        return reread(code);
    }

    @Transactional
    public AdminTeacherResponse unlock(String code) {
        User user = changeable(code);
        if (user.getStatus() == UserStatus.LOCKED) {
            user.unlock();
            auditService.record(AdminAction.TEACHER_UNLOCKED, AdminTargetType.TEACHER, user.getCode(), label(user),
                    Map.of());
        }
        return reread(code);
    }

    /** Ends every sign-in session: the teacher signs in again (a lost or shared computer). */
    @Transactional
    public AdminTeacherResponse signOut(String code) {
        User user = changeable(code);
        int ended = userSessionService.revokeAllOfUser(user.getId(), SessionRevokeReason.BY_ADMIN);
        auditService.record(AdminAction.TEACHER_SIGNED_OUT, AdminTargetType.TEACHER, user.getCode(), label(user),
                details("sessionsEnded", ended));
        return reread(code);
    }

    /**
     * Gives or takes the admin role. A new admin gets the admin pages at their next page load; an admin who loses it
     * is signed out everywhere, so no access token with the old role keeps working.
     */
    @Transactional
    public AdminTeacherResponse changeRole(String code, UserRole role) {
        User user = changeable(code);
        if (user.getRole() == role) {
            return get(code);
        }
        if (role == UserRole.ADMIN && user.getStatus() != UserStatus.ACTIVE) {
            throw new BusinessException(HttpStatus.CONFLICT, "TEACHER_LOCKED", "Unlock the account first");
        }
        if (role != UserRole.ADMIN && queries.activeAdmins() <= 1) {
            throw new BusinessException(HttpStatus.CONFLICT, "LAST_ADMIN", "There must be at least one admin");
        }
        UserRole from = user.getRole();
        user.changeRole(role);
        int ended = 0;
        if (from == UserRole.ADMIN) {
            ended = userSessionService.revokeAllOfUser(user.getId(), SessionRevokeReason.BY_ADMIN);
        }
        auditService.record(role == UserRole.ADMIN ? AdminAction.ADMIN_GRANTED : AdminAction.ADMIN_REVOKED,
                AdminTargetType.TEACHER, user.getCode(), label(user), details("sessionsEnded", ended));
        return reread(code);
    }

    /** Lifts the lock after too many wrong passwords (the teacher remembered it, or reset it). */
    @Transactional
    public AdminTeacherResponse unblockLogin(String code) {
        User user = changeable(code);
        Instant blockedUntil = loginThrottle.lockedUntil(user.getUsername(), user.getEmail()).orElse(null);
        loginThrottle.clear(user.getUsername(), user.getEmail());
        auditService.record(AdminAction.LOGIN_UNBLOCKED, AdminTargetType.TEACHER, user.getCode(), label(user),
                details("blockedUntil", blockedUntil));
        return reread(code);
    }

    /** The account after a change: written out first, as the page is read back with SQL. */
    private AdminTeacherResponse reread(String code) {
        userRepository.flush();
        return get(code);
    }

    /** An account this admin may change: exists, not deleted, not their own. */
    private User changeable(String code) {
        User user = userRepository.findByCode(code)
                .filter(u -> u.getStatus() != UserStatus.DELETED)
                .orElseThrow(() -> notFound(code));
        if (user.getCode().equals(currentUserService.getCurrentUser().getCode())) {
            throw new BusinessException(HttpStatus.CONFLICT, "CANNOT_CHANGE_OWN_ACCOUNT",
                    "Admins do not change their own account here");
        }
        return user;
    }

    private static AdminTeacherSummaryResponse summary(AdminQueries.TeacherRow row) {
        return new AdminTeacherSummaryResponse(row.code(), row.displayName(), row.username(), row.email(),
                UserRole.valueOf(row.role()), UserStatus.valueOf(row.status()), row.emailVerifiedAt() != null,
                row.createdAt(), row.lastActiveAt(), row.classrooms(), row.games());
    }

    /** "Cô Lan (colan@truong.edu.vn)", as the admin log keeps it. */
    private static String label(User user) {
        return "%s (%s)".formatted(user.getDisplayName(), user.getEmail() != null ? user.getEmail() : user.getUsername());
    }

    /** Key / value pairs; {@code null} values are left out of the log. */
    private static Map<String, Object> details(Object... pairs) {
        Map<String, Object> details = new LinkedHashMap<>();
        for (int i = 0; i < pairs.length; i += 2) {
            details.put((String) pairs[i], pairs[i + 1]);
        }
        return details;
    }

    private static List<String> names(Collection<? extends Enum<?>> values) {
        return values.stream().map(Enum::name).toList();
    }

    private static ResourceNotFoundException notFound(String code) {
        return new ResourceNotFoundException("Teacher", code);
    }
}
