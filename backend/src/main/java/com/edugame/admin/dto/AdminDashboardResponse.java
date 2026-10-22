package com.edugame.admin.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * The overview of the whole system for [from, to] (whole days of the school's time zone).
 *
 * @param plays       games played in the period (started, not cancelled)
 * @param daily       every day of the period, also the empty ones
 * @param newFeedback feedback no admin has read yet
 */
public record AdminDashboardResponse(
        LocalDate from,
        LocalDate to,
        Teachers teachers,
        Content content,
        long plays,
        List<Day> daily,
        List<TemplatePlays> topTemplates,
        long newFeedback) {

    /**
     * @param total  accounts not deleted (admins included)
     * @param active used in the period
     * @param joined made in the period
     */
    public record Teachers(long total, long active, long joined, long locked, long admins) {
    }

    /** What exists now (not archived). */
    public record Content(long classrooms, long students, long games, long questionSets) {
    }

    public record Day(LocalDate date, long signUps, long plays) {
    }

    public record TemplatePlays(String templateCode, String templateName, long plays) {
    }
}
