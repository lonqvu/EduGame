package com.edugame.classroom.dto;

import java.time.Instant;

import com.edugame.classroom.domain.ClassroomStatus;

/**
 * A class of the teacher.
 *
 * @param studentCount   students still in the class (ACTIVE)
 * @param activityCount  games played with the class (sessions started, not cancelled)
 * @param completedCount of those, played to the results screen
 * @param completionRate completedCount / activityCount in percent (0 when nothing was played)
 * @param lastPlayedAt   when the last game with the class started (null when none)
 */
public record ClassroomResponse(
        String code,
        String name,
        Short grade,
        String schoolYear,
        String schoolName,
        String avatar,
        ClassroomStatus status,
        long studentCount,
        long activityCount,
        long completedCount,
        int completionRate,
        Instant lastPlayedAt,
        Instant createdAt) {
}
