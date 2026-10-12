package com.edugame.classroom.domain;

/** Values of {@code classroom.status} (ck_classroom_status). */
public enum ClassroomStatus {
    ACTIVE,
    /** Taking a break: kept with its students and stars, but not played with. */
    PAUSED,
    ARCHIVED
}
