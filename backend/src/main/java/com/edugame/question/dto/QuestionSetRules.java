package com.edugame.question.dto;

/** Limits of the question bank. */
public final class QuestionSetRules {

    /** Sets a teacher keeps (archived ones not counted). */
    public static final int MAX_SETS = 200;
    public static final int MAX_QUESTIONS = 200;
    public static final int MIN_OPTIONS = 2;
    public static final int MAX_OPTIONS = 6;
    public static final int MAX_TITLE = 120;
    public static final int MAX_TEXT = 500;
    public static final int MAX_OPTION_TEXT = 200;
    public static final int MAX_ANSWER = 200;
    public static final String SUBJECTS = "TOAN|TIENG_VIET|TIENG_ANH|TU_NHIEN_XA_HOI|KHOA_HOC|KHAC";
    /** Any text with at least one non-blank character. */
    public static final String NOT_BLANK = "(?s).*\\S.*";

    private QuestionSetRules() {
    }
}
