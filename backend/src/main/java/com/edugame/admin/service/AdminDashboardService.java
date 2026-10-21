package com.edugame.admin.service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.edugame.admin.dto.AdminDashboardResponse;
import com.edugame.admin.repository.AdminQueries;
import com.edugame.common.config.AppProperties;
import com.edugame.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** "Tổng quan": how many teachers use the app, what they make and play. */
@Service
@RequiredArgsConstructor
public class AdminDashboardService {

    public static final int MAX_DAYS = 366;
    private static final int TOP_TEMPLATES = 5;
    private static final ZoneId DEFAULT_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final AdminQueries queries;
    private final AppProperties appProperties;

    /** The last {@code days} days, today included. */
    @Transactional(readOnly = true)
    public AdminDashboardResponse overview(int days) {
        if (days < 1 || days > MAX_DAYS) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_RANGE",
                    "days must be between 1 and %d".formatted(MAX_DAYS));
        }
        ZoneId zone = zone();
        LocalDate last = LocalDate.now(zone);
        LocalDate first = last.minusDays(days - 1L);
        Instant from = first.atStartOfDay(zone).toInstant();
        Instant to = last.plusDays(1).atStartOfDay(zone).toInstant();

        AdminQueries.Totals totals = queries.totals(from, to);
        Map<LocalDate, Long> signUps = byDay(queries.signUpsPerDay(from, to, zone.getId()));
        Map<LocalDate, Long> plays = byDay(queries.playsPerDay(from, to, zone.getId()));
        List<AdminDashboardResponse.Day> daily = new ArrayList<>(days);
        for (LocalDate day = first; !day.isAfter(last); day = day.plusDays(1)) {
            daily.add(new AdminDashboardResponse.Day(day, signUps.getOrDefault(day, 0L), plays.getOrDefault(day, 0L)));
        }
        List<AdminDashboardResponse.TemplatePlays> top = queries.topTemplates(from, to, TOP_TEMPLATES).stream()
                .map(t -> new AdminDashboardResponse.TemplatePlays(t.code(), t.name(), t.count()))
                .toList();

        return new AdminDashboardResponse(first, last,
                new AdminDashboardResponse.Teachers(totals.teachers(), totals.activeTeachers(), totals.newTeachers(),
                        totals.lockedTeachers(), totals.admins()),
                new AdminDashboardResponse.Content(totals.classrooms(), totals.students(), totals.games(),
                        totals.questionSets()),
                totals.plays(), daily, top, totals.newFeedback());
    }

    private static Map<LocalDate, Long> byDay(List<AdminQueries.DayCount> counts) {
        return counts.stream().collect(Collectors.toMap(AdminQueries.DayCount::day, AdminQueries.DayCount::count));
    }

    private ZoneId zone() {
        return appProperties.timeZone() != null ? appProperties.timeZone() : DEFAULT_ZONE;
    }
}
