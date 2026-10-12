package com.edugame.question.domain;

/** Subjects of the primary school a set is for, with the name shown to teachers. */
public enum Subject {
    TOAN("Toán"),
    TIENG_VIET("Tiếng Việt"),
    TIENG_ANH("Tiếng Anh"),
    TU_NHIEN_XA_HOI("Tự nhiên và Xã hội"),
    KHOA_HOC("Khoa học"),
    KHAC("Khác");

    private final String label;

    Subject(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
