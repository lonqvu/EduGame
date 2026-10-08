package com.edugame.classroom.dto;

/**
 * A student on the class list.
 *
 * @param weeklyStars stars since Monday 00:00 (school time zone), for the "top stars this week" board
 * @param totalStars  all stars ever collected
 */
public record StudentResponse(
        Long id,
        String displayName,
        String avatar,
        Short rollNumber,
        long weeklyStars,
        long totalStars) {
}
