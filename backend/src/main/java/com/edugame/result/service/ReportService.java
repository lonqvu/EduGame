package com.edugame.result.service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import com.edugame.classroom.domain.Classroom;
import com.edugame.classroom.service.ClassroomService;
import com.edugame.common.config.AppProperties;
import com.edugame.common.exception.BusinessException;
import com.edugame.play.dto.GameResults;
import com.edugame.result.dto.ClassReportResponse;
import com.edugame.result.dto.ClassReportResponse.Day;
import com.edugame.result.dto.ClassReportResponse.GameCount;
import com.edugame.result.dto.ClassReportResponse.Session;
import com.edugame.result.dto.ClassReportResponse.StudentStars;
import com.edugame.result.dto.ClassReportResponse.Summary;
import com.edugame.result.dto.ClassReportResponse.TemplateCount;
import com.edugame.result.repository.ReportQueries;
import com.edugame.result.repository.ReportQueries.SessionRow;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * "Báo cáo" of a class over a period of whole days in the school's time zone: what was played, how it ended, the
 * time it took and the stars given, compared with the period just before.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReportService {

    /** Longest period a report covers: a school year and a bit. */
    static final int MAX_DAYS = 366;

    /** Days of the default period, ending today. */
    static final int DEFAULT_DAYS = 30;

    /** A game counts at most this long: a projector left on the results overnight is not two hours of play. */
    static final Duration MAX_GAME_DURATION = Duration.ofHours(2);

    private static final ZoneId DEFAULT_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final int TOP_GAMES = 5;

    private final ClassroomService classroomService;
    private final ReportQueries reportQueries;
    private final AppProperties appProperties;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public ClassReportResponse classReport(String classroomCode, LocalDate from, LocalDate to) {
        Classroom classroom = classroomService.getOwnedClassroom(classroomCode);
        ZoneId zone = zone();
        LocalDate last = to != null ? to : LocalDate.now(zone);
        LocalDate first = from != null ? from : last.minusDays(DEFAULT_DAYS - 1);
        if (first.isAfter(last)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_RANGE", "from is after to");
        }
        long days = ChronoUnit.DAYS.between(first, last) + 1;
        if (days > MAX_DAYS) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_RANGE",
                    "A report covers at most %d days".formatted(MAX_DAYS));
        }

        Instant start = first.atStartOfDay(zone).toInstant();
        Instant end = last.plusDays(1).atStartOfDay(zone).toInstant();
        Instant previousStart = first.minusDays(days).atStartOfDay(zone).toInstant();

        List<SessionRow> sessions = reportQueries.sessions(classroom.getId(), start, end);
        List<SessionRow> previousSessions = reportQueries.sessions(classroom.getId(), previousStart, start);
        Map<Long, GameResults> results = new LinkedHashMap<>();
        sessions.forEach(s -> results.put(s.id(), readResults(s)));

        List<StudentStars> students = reportQueries.studentStars(classroom.getId(), start, end).stream()
                .map(s -> new StudentStars(s.id(), s.displayName(), s.rollNumber(), s.stars()))
                .toList();

        return new ClassReportResponse(
                new ClassReportResponse.Classroom(classroom.getCode(), classroom.getName(), classroom.getGrade(),
                        students.size()),
                first,
                last,
                summary(sessions, results, reportQueries.stars(classroom.getId(), start, end)),
                summary(previousSessions, Map.of(), reportQueries.stars(classroom.getId(), previousStart, start)),
                daily(sessions, first, last, zone),
                byTemplate(sessions),
                topGames(sessions),
                students,
                sessions.stream().limit(ClassReportResponse.MAX_SESSIONS)
                        .map(s -> new Session(s.id(), s.gameCode(), s.gameTitle(), s.templateCode(), s.templateName(),
                                s.status(), s.startedAt(), s.endedAt(), minutes(s), results.get(s.id())))
                        .toList());
    }

    private static Summary summary(List<SessionRow> sessions, Map<Long, GameResults> results, long stars) {
        long completed = sessions.stream().filter(ReportService::ended).count();
        long minutes = sessions.stream().map(ReportService::minutes).filter(Objects::nonNull).mapToLong(Long::longValue)
                .sum();
        long correct = results.values().stream().filter(Objects::nonNull)
                .flatMap(r -> r.teams() == null ? Stream.<GameResults.Team>empty() : r.teams().stream())
                .mapToLong(GameResults.Team::correct).sum();
        long games = sessions.stream().map(SessionRow::gameCode).distinct().count();
        return new Summary(sessions.size(), completed, minutes, stars, correct, games);
    }

    private static List<Day> daily(List<SessionRow> sessions, LocalDate first, LocalDate last, ZoneId zone) {
        Map<LocalDate, List<SessionRow>> byDay = sessions.stream()
                .collect(Collectors.groupingBy(s -> LocalDate.ofInstant(s.startedAt(), zone)));
        List<Day> days = new ArrayList<>();
        for (LocalDate day = first; !day.isAfter(last); day = day.plusDays(1)) {
            List<SessionRow> ofDay = byDay.getOrDefault(day, List.of());
            days.add(new Day(day, ofDay.size(), ofDay.stream().filter(ReportService::ended).count()));
        }
        return days;
    }

    private static List<TemplateCount> byTemplate(List<SessionRow> sessions) {
        return counted(sessions, SessionRow::templateCode).stream()
                .map(e -> new TemplateCount(e.first().templateCode(), e.first().templateName(), e.count()))
                .toList();
    }

    private static List<GameCount> topGames(List<SessionRow> sessions) {
        return counted(sessions, SessionRow::gameCode).stream().limit(TOP_GAMES)
                .map(e -> new GameCount(e.first().gameCode(), e.first().gameTitle(), e.first().templateCode(), e.count()))
                .toList();
    }

    private record Counted(SessionRow first, long count) {
    }

    /** Sessions grouped by a key, most first; a tie goes to the one played last. */
    private static List<Counted> counted(List<SessionRow> sessions, Function<SessionRow, String> key) {
        Map<String, Counted> groups = new LinkedHashMap<>();
        for (SessionRow s : sessions) {
            groups.merge(key.apply(s), new Counted(s, 1), (a, b) -> new Counted(a.first(), a.count() + 1));
        }
        return groups.values().stream().sorted(Comparator.comparingLong(Counted::count).reversed()).toList();
    }

    private static boolean ended(SessionRow s) {
        return "ENDED".equals(s.status());
    }

    /** Whole minutes of an ended game, at most MAX_GAME_DURATION; {@code null} while it has not ended. */
    private static Long minutes(SessionRow s) {
        if (!ended(s) || s.endedAt() == null || s.startedAt() == null) {
            return null;
        }
        Duration played = Duration.between(s.startedAt(), s.endedAt());
        if (played.isNegative()) {
            return 0L;
        }
        return Math.round((played.compareTo(MAX_GAME_DURATION) > 0 ? MAX_GAME_DURATION : played).toSeconds() / 60.0);
    }

    /** The results kept with a session; {@code null} when none were kept or they no longer read. */
    private GameResults readResults(SessionRow s) {
        if (s.results() == null) {
            return null;
        }
        try {
            return objectMapper.readValue(s.results(), GameResults.class);
        } catch (JsonProcessingException e) {
            log.warn("Results of session {} do not read: {}", s.id(), e.getMessage());
            return null;
        }
    }

    private ZoneId zone() {
        return appProperties.timeZone() != null ? appProperties.timeZone() : DEFAULT_ZONE;
    }
}
