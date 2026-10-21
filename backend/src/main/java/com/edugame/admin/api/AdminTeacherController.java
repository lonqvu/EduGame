package com.edugame.admin.api;

import java.util.List;

import com.edugame.admin.dto.AdminTeacherPage;
import com.edugame.admin.dto.AdminTeacherResponse;
import com.edugame.admin.dto.LockTeacherRequest;
import com.edugame.admin.dto.UpdateTeacherRoleRequest;
import com.edugame.admin.repository.AdminQueries;
import com.edugame.admin.service.AdminTeacherService;
import com.edugame.user.domain.UserRole;
import com.edugame.user.domain.UserStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Every change answers the account as it is now, and is written to the admin log. */
@Tag(name = "Admin", description = "\"Quản trị\": overview, teachers and the admin log (role ADMIN)")
@RestController
@RequestMapping("/api/v1/admin/teachers")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminTeacherController {

    private final AdminTeacherService teacherService;

    @Operation(summary = "Accounts, with search, filters and sorting",
            description = "q: part of the name, username or email. status (repeatable): default ACTIVE and LOCKED. "
                    + "role (repeatable): default all. sort: NEWEST (default), LAST_ACTIVE, NAME. size at most 100.")
    @GetMapping
    public AdminTeacherPage list(@RequestParam(required = false) String q,
                                 @RequestParam(required = false) List<UserStatus> status,
                                 @RequestParam(required = false) List<UserRole> role,
                                 @RequestParam(defaultValue = "NEWEST") AdminQueries.TeacherSort sort,
                                 @RequestParam(defaultValue = "0") int page,
                                 @RequestParam(defaultValue = "20") int size) {
        return teacherService.list(q, status, role, sort, page, size);
    }

    @Operation(summary = "One account: figures, devices, sign-in block and admin history")
    @GetMapping("/{code}")
    public AdminTeacherResponse get(@PathVariable String code) {
        return teacherService.get(code);
    }

    @Operation(summary = "Lock: no sign-in, every session ends",
            description = "409 ADMIN_CANNOT_BE_LOCKED for an admin, CANNOT_CHANGE_OWN_ACCOUNT for oneself.")
    @PostMapping("/{code}/lock")
    public AdminTeacherResponse lock(@PathVariable String code,
                                     @Valid @RequestBody(required = false) LockTeacherRequest request) {
        return teacherService.lock(code, request == null ? null : request.reason());
    }

    @Operation(summary = "Unlock")
    @PostMapping("/{code}/unlock")
    public AdminTeacherResponse unlock(@PathVariable String code) {
        return teacherService.unlock(code);
    }

    @Operation(summary = "Sign out of every device")
    @PostMapping("/{code}/sign-out")
    public AdminTeacherResponse signOut(@PathVariable String code) {
        return teacherService.signOut(code);
    }

    @Operation(summary = "Give or take the admin role",
            description = "Taking it signs the account out everywhere. 409 TEACHER_LOCKED (to make a locked "
                    + "account admin), LAST_ADMIN, CANNOT_CHANGE_OWN_ACCOUNT.")
    @PutMapping("/{code}/role")
    public AdminTeacherResponse changeRole(@PathVariable String code,
                                           @Valid @RequestBody UpdateTeacherRoleRequest request) {
        return teacherService.changeRole(code, request.role());
    }

    @Operation(summary = "Lift the sign-in block after too many wrong passwords")
    @PostMapping("/{code}/login-unblock")
    public AdminTeacherResponse unblockLogin(@PathVariable String code) {
        return teacherService.unblockLogin(code);
    }
}
