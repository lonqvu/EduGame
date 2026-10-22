package com.edugame.admin.api;

import com.edugame.admin.dto.AdminDashboardResponse;
import com.edugame.admin.service.AdminDashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Admin", description = "\"Quản trị\": overview, teachers and the admin log (role ADMIN)")
@RestController
@RequestMapping("/api/v1/admin/dashboard")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final AdminDashboardService dashboardService;

    @Operation(summary = "Teachers, content and games played over the last days (today included)",
            description = "days: 1-366, default 30. 400 INVALID_RANGE otherwise.")
    @GetMapping
    public AdminDashboardResponse overview(@RequestParam(defaultValue = "30") int days) {
        return dashboardService.overview(days);
    }
}
