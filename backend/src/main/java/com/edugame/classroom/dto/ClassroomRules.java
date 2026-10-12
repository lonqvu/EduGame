package com.edugame.classroom.dto;

/** Limits of classes and class lists, shared by the requests and the service. */
public final class ClassroomRules {

    /** "2026-2027"; the service also checks the second year follows the first. */
    public static final String SCHOOL_YEAR = "\\d{4}-\\d{4}";

    /** Classes a teacher can have that are not archived. */
    public static final int MAX_CLASSROOMS = 30;

    /** Students in one class. */
    public static final int MAX_STUDENTS = 60;

    private ClassroomRules() {
    }
}
