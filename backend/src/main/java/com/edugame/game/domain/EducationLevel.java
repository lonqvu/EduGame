package com.edugame.game.domain;

/** Values of {@code game.education_level} (ck_game_education_level). */
public enum EducationLevel {
    MAM_NON(0, 0),
    TIEU_HOC(1, 5),
    THCS(6, 9),
    THPT(10, 12),
    DAI_HOC(1, 6),
    KHAC(Short.MIN_VALUE, Short.MAX_VALUE);

    private final int minGrade;
    private final int maxGrade;

    EducationLevel(int minGrade, int maxGrade) {
        this.minGrade = minGrade;
        this.maxGrade = maxGrade;
    }

    /** Mirrors ck_game_grade: no grade is always fine; MAM_NON never has one. */
    public boolean allowsGrade(Short grade) {
        return grade == null || (this != MAM_NON && grade >= minGrade && grade <= maxGrade);
    }
}
