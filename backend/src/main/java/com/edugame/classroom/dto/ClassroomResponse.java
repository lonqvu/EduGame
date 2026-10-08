package com.edugame.classroom.dto;

/** @param studentCount students still in the class (ACTIVE) */
public record ClassroomResponse(
        String code,
        String name,
        Short grade,
        String schoolYear,
        long studentCount) {
}
