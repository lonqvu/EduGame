package com.edugame.admin.repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Read-only SQL of the admin pages: they count across every module, so they read the tables directly. Only
 * figures and the teachers' own account data come out; students are counted, never named.
 */
@Repository
@RequiredArgsConstructor
public class AdminQueries {

    /** When a teacher last did something: signed in, or used a session (each page load renews it). */
    private static final String LAST_ACTIVE = """
            GREATEST(u.last_login_at, (SELECT max(s.last_used_at) FROM user_session s WHERE s.user_id = u.id))""";

    private static final String TEACHER_COLUMNS = """
            u.id, u.code, u.username, u.display_name, u.email, u.phone, u.role, u.status, u.created_at,
            u.email_verified_at, %s AS last_active_at,
            (SELECT count(*) FROM classroom c WHERE c.teacher_id = u.id AND c.status <> 'ARCHIVED') AS classrooms,
            (SELECT count(*) FROM game g WHERE g.owner_id = u.id AND g.status <> 'ARCHIVED') AS games
            """.formatted(LAST_ACTIVE);

    /** How the teacher list can be sorted; the value is SQL, never taken from the request. */
    public enum TeacherSort {
        NEWEST("u.created_at DESC"),
        LAST_ACTIVE("last_active_at DESC NULLS LAST"),
        NAME("lower(u.display_name) ASC");

        private final String orderBy;

        TeacherSort(String orderBy) {
            this.orderBy = orderBy;
        }
    }

    public record TeacherRow(Long id, String code, String username, String displayName, String email, String phone,
                             String role, String status, Instant createdAt, Instant emailVerifiedAt,
                             Instant lastActiveAt, long classrooms, long games) {
    }

    public record TeacherPage(List<TeacherRow> rows, long total) {
    }

    /** What one teacher has made and played. */
    public record TeacherFigures(long students, long questionSets, long plays, long recentPlays, long openSessions) {
    }

    public record DeviceRow(String device, Instant firstSeenAt, Instant lastSeenAt) {
    }

    public record Totals(long teachers, long activeTeachers, long newTeachers, long lockedTeachers, long admins,
                         long classrooms, long students, long games, long questionSets, long plays, long newFeedback) {
    }

    public record DayCount(LocalDate day, long count) {
    }

    public record TemplateCount(String code, String name, long count) {
    }

    private final NamedParameterJdbcTemplate jdbc;

    /**
     * One page of accounts (teachers and admins).
     *
     * @param search   part of the name, username or email (any case); null: all
     * @param statuses wanted statuses, never empty
     * @param roles    wanted roles, never empty
     */
    public TeacherPage teachers(String search, Collection<String> statuses, Collection<String> roles, TeacherSort sort,
                                int page, int size) {
        MapSqlParameterSource params = new MapSqlParameterSource("statuses", statuses).addValue("roles", roles)
                .addValue("limit", size).addValue("offset", (long) page * size);
        StringBuilder where = new StringBuilder("u.status IN (:statuses) AND u.role IN (:roles)");
        if (search != null) {
            where.append("""
                     AND (u.display_name ILIKE :search ESCAPE '\\' OR u.username ILIKE :search ESCAPE '\\'
                          OR u.email ILIKE :search ESCAPE '\\')""");
            params.addValue("search", "%" + escapeLike(search) + "%");
        }
        List<Long> total = new ArrayList<>(1);
        List<TeacherRow> rows = jdbc.query("""
                SELECT %s, count(*) OVER () AS total
                FROM users u
                WHERE %s
                ORDER BY %s, u.id DESC
                LIMIT :limit OFFSET :offset
                """.formatted(TEACHER_COLUMNS, where, sort.orderBy), params, (rs, i) -> {
            if (i == 0) {
                total.add(rs.getLong("total"));
            }
            return teacherRow(rs);
        });
        long count = total.isEmpty() ? countTeachers(where.toString(), params) : total.getFirst();
        return new TeacherPage(rows, count);
    }

    public Optional<TeacherRow> teacher(String code) {
        return jdbc.query("SELECT %s FROM users u WHERE u.code = :code".formatted(TEACHER_COLUMNS),
                new MapSqlParameterSource("code", code), (rs, i) -> teacherRow(rs)).stream().findFirst();
    }

    /** {@code recentSince}: start of "the last 30 days" for {@code recentPlays}. */
    public TeacherFigures figures(Long userId, Instant recentSince, Instant now) {
        return jdbc.queryForObject("""
                SELECT
                  (SELECT count(*) FROM classroom_student cs JOIN classroom c ON c.id = cs.classroom_id
                   WHERE c.teacher_id = :userId AND c.status <> 'ARCHIVED' AND cs.status = 'ACTIVE') AS students,
                  (SELECT count(*) FROM question_set q WHERE q.owner_id = :userId AND q.status = 'ACTIVE') AS sets,
                  (SELECT count(*) FROM game_session s
                   WHERE s.host_id = :userId AND s.status IN ('IN_PROGRESS', 'ENDED')) AS plays,
                  (SELECT count(*) FROM game_session s
                   WHERE s.host_id = :userId AND s.status IN ('IN_PROGRESS', 'ENDED')
                     AND s.started_at >= :recentSince) AS recent_plays,
                  (SELECT count(*) FROM user_session us
                   WHERE us.user_id = :userId AND us.revoked_at IS NULL AND us.expires_at > :now) AS open_sessions
                """, new MapSqlParameterSource("userId", userId).addValue("recentSince", Timestamp.from(recentSince))
                .addValue("now", Timestamp.from(now)), (rs, i) -> new TeacherFigures(rs.getLong("students"),
                rs.getLong("sets"), rs.getLong("plays"), rs.getLong("recent_plays"), rs.getLong("open_sessions")));
    }

    /** Browsers the teacher signed in from, most recent first. */
    public List<DeviceRow> devices(Long userId) {
        return jdbc.query("""
                SELECT device, first_seen_at, last_seen_at FROM user_known_device
                WHERE user_id = :userId ORDER BY last_seen_at DESC LIMIT 20
                """, new MapSqlParameterSource("userId", userId), (rs, i) -> new DeviceRow(rs.getString("device"),
                instant(rs.getTimestamp("first_seen_at")), instant(rs.getTimestamp("last_seen_at"))));
    }

    /** Active admins (to never take the role from the last one). */
    public long activeAdmins() {
        Long count = jdbc.queryForObject("SELECT count(*) FROM users WHERE role = 'ADMIN' AND status = 'ACTIVE'",
                Map.of(), Long.class);
        return count == null ? 0 : count;
    }

    /** The figures of the overview for [from, to). */
    public Totals totals(Instant from, Instant to) {
        return jdbc.queryForObject("""
                SELECT
                  (SELECT count(*) FROM users WHERE status <> 'DELETED') AS teachers,
                  (SELECT count(*) FROM users u WHERE u.status <> 'DELETED' AND %s >= :from) AS active_teachers,
                  (SELECT count(*) FROM users WHERE status <> 'DELETED' AND created_at >= :from AND created_at < :to)
                      AS new_teachers,
                  (SELECT count(*) FROM users WHERE status = 'LOCKED') AS locked_teachers,
                  (SELECT count(*) FROM users WHERE status = 'ACTIVE' AND role = 'ADMIN') AS admins,
                  (SELECT count(*) FROM classroom WHERE status <> 'ARCHIVED') AS classrooms,
                  (SELECT count(*) FROM classroom_student cs JOIN classroom c ON c.id = cs.classroom_id
                   WHERE c.status <> 'ARCHIVED' AND cs.status = 'ACTIVE') AS students,
                  (SELECT count(*) FROM game WHERE status <> 'ARCHIVED') AS games,
                  (SELECT count(*) FROM question_set WHERE status = 'ACTIVE') AS question_sets,
                  (SELECT count(*) FROM game_session WHERE status IN ('IN_PROGRESS', 'ENDED')
                     AND started_at >= :from AND started_at < :to) AS plays,
                  (SELECT count(*) FROM feedback WHERE status = 'NEW') AS new_feedback
                """.formatted(LAST_ACTIVE), range(from, to), (rs, i) -> new Totals(rs.getLong("teachers"),
                rs.getLong("active_teachers"), rs.getLong("new_teachers"), rs.getLong("locked_teachers"),
                rs.getLong("admins"), rs.getLong("classrooms"), rs.getLong("students"), rs.getLong("games"),
                rs.getLong("question_sets"), rs.getLong("plays"), rs.getLong("new_feedback")));
    }

    /** Accounts made per day of the school's time zone in [from, to); days without any are left out. */
    public List<DayCount> signUpsPerDay(Instant from, Instant to, String zone) {
        return perDay("SELECT created_at AS at FROM users WHERE created_at >= :from AND created_at < :to", from, to, zone);
    }

    /** Games played per day (started, not cancelled). */
    public List<DayCount> playsPerDay(Instant from, Instant to, String zone) {
        return perDay("""
                SELECT started_at AS at FROM game_session
                WHERE status IN ('IN_PROGRESS', 'ENDED') AND started_at >= :from AND started_at < :to""",
                from, to, zone);
    }

    /** The game types played most in [from, to). */
    public List<TemplateCount> topTemplates(Instant from, Instant to, int limit) {
        return jdbc.query("""
                SELECT t.code, t.name, count(*) AS plays
                FROM game_session s
                JOIN game g ON g.id = s.game_id
                JOIN game_template t ON t.id = g.template_id
                WHERE s.status IN ('IN_PROGRESS', 'ENDED') AND s.started_at >= :from AND s.started_at < :to
                GROUP BY t.code, t.name
                ORDER BY plays DESC, t.name
                LIMIT :limit
                """, range(from, to).addValue("limit", limit),
                (rs, i) -> new TemplateCount(rs.getString("code"), rs.getString("name"), rs.getLong("plays")));
    }

    private List<DayCount> perDay(String events, Instant from, Instant to, String zone) {
        return jdbc.query("""
                SELECT (e.at AT TIME ZONE :zone)::date AS day, count(*) AS n
                FROM (%s) e
                GROUP BY 1 ORDER BY 1
                """.formatted(events), range(from, to).addValue("zone", zone),
                (rs, i) -> new DayCount(rs.getObject("day", LocalDate.class), rs.getLong("n")));
    }

    private long countTeachers(String where, MapSqlParameterSource params) {
        Long count = jdbc.queryForObject("SELECT count(*) FROM users u WHERE " + where, params, Long.class);
        return count == null ? 0 : count;
    }

    private static TeacherRow teacherRow(ResultSet rs) throws SQLException {
        return new TeacherRow(rs.getLong("id"), rs.getString("code"), rs.getString("username"),
                rs.getString("display_name"), rs.getString("email"), rs.getString("phone"), rs.getString("role"),
                rs.getString("status"), instant(rs.getTimestamp("created_at")),
                instant(rs.getTimestamp("email_verified_at")), instant(rs.getTimestamp("last_active_at")),
                rs.getLong("classrooms"), rs.getLong("games"));
    }

    /** {@code %} and {@code _} typed by the admin are searched for as they are. */
    private static String escapeLike(String text) {
        return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    private static MapSqlParameterSource range(Instant from, Instant to) {
        return new MapSqlParameterSource("from", Timestamp.from(from)).addValue("to", Timestamp.from(to));
    }

    private static Instant instant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }
}
