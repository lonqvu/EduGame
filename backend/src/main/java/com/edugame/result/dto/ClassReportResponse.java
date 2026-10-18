package com.edugame.result.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import com.edugame.play.dto.GameResults;

/**
 * "Báo cáo" of a class from {@code from} to {@code to} (whole days, in the school's time zone).
 *
 * @param previous   the same figures over the period of the same length just before, for the trends
 * @param daily      one entry per day of the period, days without games included
 * @param byTemplate games played per kind of game, most played first
 * @param topGames   the teacher's games played the most (at most 5)
 * @param students   every student still in the class with the stars of the period, most first
 * @param sessions   games played, newest first (at most {@link #MAX_SESSIONS}; {@code summary.activities} counts all)
 */
public record ClassReportResponse(
        Classroom classroom,
        LocalDate from,
        LocalDate to,
        Summary summary,
        Summary previous,
        List<Day> daily,
        List<TemplateCount> byTemplate,
        List<GameCount> topGames,
        List<StudentStars> students,
        List<Session> sessions) {

    public static final int MAX_SESSIONS = 200;

    public record Classroom(String code, String name, short grade, long studentCount) {
    }

    /**
     * @param activities     games started with the class
     * @param completed      of them, games that reached the results
     * @param playMinutes    time of the completed games (each counted at most 2 hours: a projector left open)
     * @param stars          stars given to the students, minus the ones taken back
     * @param correctAnswers right answers of the teams, in the games whose results were kept
     * @param games          different games played
     */
    public record Summary(long activities, long completed, long playMinutes, long stars, long correctAnswers,
                          long games) {
    }

    public record Day(LocalDate date, long activities, long completed) {
    }

    public record TemplateCount(String templateCode, String templateName, long activities) {
    }

    public record GameCount(String gameCode, String title, String templateCode, long activities) {
    }

    public record StudentStars(Long id, String displayName, Short rollNumber, long stars) {
    }

    /**
     * @param minutes {@code null} while the game has not ended
     * @param results what the results screen showed; {@code null} when it was not kept (older games, tools)
     */
    public record Session(Long id, String gameCode, String gameTitle, String templateCode, String templateName,
                          String status, Instant startedAt, Instant endedAt, Long minutes, GameResults results) {
    }
}
