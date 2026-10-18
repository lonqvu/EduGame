package com.edugame.result.repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/** Read-only SQL of the reports: they aggregate across modules, so they read the tables directly. */
@Repository
@RequiredArgsConstructor
public class ReportQueries {

    private final NamedParameterJdbcTemplate jdbc;

    /** A game played with the class (started, not cancelled). */
    public record SessionRow(Long id, String gameCode, String gameTitle, String templateCode, String templateName,
                             String status, Instant startedAt, Instant endedAt, String results) {
    }

    public record StudentRow(Long id, String displayName, Short rollNumber, long stars) {
    }

    /** Games started with the class in [from, to), newest first. */
    public List<SessionRow> sessions(Long classroomId, Instant from, Instant to) {
        return jdbc.query("""
                SELECT s.id, g.code AS game_code, g.title, t.code AS template_code, t.name AS template_name,
                       s.status, s.started_at, s.ended_at, s.state -> 'results' AS results
                FROM game_session s
                JOIN game g ON g.id = s.game_id
                JOIN game_template t ON t.id = g.template_id
                WHERE s.classroom_id = :classroomId AND s.status IN ('IN_PROGRESS', 'ENDED')
                  AND s.started_at >= :from AND s.started_at < :to
                ORDER BY s.started_at DESC, s.id DESC
                """, range(classroomId, from, to), (rs, i) -> new SessionRow(
                rs.getLong("id"), rs.getString("game_code"), rs.getString("title"), rs.getString("template_code"),
                rs.getString("template_name"), rs.getString("status"), instant(rs.getTimestamp("started_at")),
                instant(rs.getTimestamp("ended_at")), rs.getString("results")));
    }

    /** Every student still in the class, with the stars given (minus taken back) in [from, to). */
    public List<StudentRow> studentStars(Long classroomId, Instant from, Instant to) {
        return jdbc.query("""
                SELECT cs.id, cs.display_name, cs.roll_number,
                       COALESCE(SUM(p.points) FILTER (WHERE p.created_at >= :from AND p.created_at < :to), 0) AS stars
                FROM classroom_student cs
                LEFT JOIN student_point p ON p.classroom_student_id = cs.id
                WHERE cs.classroom_id = :classroomId AND cs.status = 'ACTIVE'
                GROUP BY cs.id, cs.display_name, cs.roll_number
                ORDER BY stars DESC, cs.roll_number NULLS LAST, cs.display_name
                """, range(classroomId, from, to), (rs, i) -> new StudentRow(rs.getLong("id"),
                rs.getString("display_name"), (Short) rs.getObject("roll_number", Short.class), rs.getLong("stars")));
    }

    /** Stars given to the class's students (still in it or not) in [from, to), minus the ones taken back. */
    public long stars(Long classroomId, Instant from, Instant to) {
        Long stars = jdbc.queryForObject("""
                SELECT COALESCE(SUM(p.points), 0) FROM student_point p
                JOIN classroom_student cs ON cs.id = p.classroom_student_id
                WHERE cs.classroom_id = :classroomId AND p.created_at >= :from AND p.created_at < :to
                """, range(classroomId, from, to), Long.class);
        return stars == null ? 0 : stars;
    }

    private static MapSqlParameterSource range(Long classroomId, Instant from, Instant to) {
        return new MapSqlParameterSource("classroomId", classroomId)
                .addValue("from", Timestamp.from(from))
                .addValue("to", Timestamp.from(to));
    }

    private static Instant instant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }
}
