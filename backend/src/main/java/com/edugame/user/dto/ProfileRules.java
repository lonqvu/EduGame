package com.edugame.user.dto;

import java.util.Set;
import java.util.regex.Pattern;

/** Limits of the profile shown and edited in "Hồ sơ của tôi" (checked again by ck_users_* in the database). */
public final class ProfileRules {

    public static final int MAX_DISPLAY_NAME = 100;

    /** Pictures a teacher can pick: the default teacher drawing or one of the class animals. */
    public static final Set<String> AVATARS = Set.of("teacher", "bear", "rabbit", "lion", "cat", "fox", "panda", "owl", "frog");

    /** {@code users.avatar} of a teacher who uploaded a picture (table user_avatar). */
    public static final String UPLOADED = "upload";

    /** Largest picture file taken; it is made much smaller before it is stored. */
    public static final long MAX_UPLOAD_BYTES = 5L * 1024 * 1024;

    /** Spaces, dots, dashes and brackets people type between digit groups. */
    private static final Pattern SEPARATORS = Pattern.compile("[\\s.\\-()]");
    private static final Pattern PHONE = Pattern.compile("\\+?[0-9]{9,15}");

    private ProfileRules() {
    }

    /**
     * A phone number as stored: separators removed ("0987 654 321" -> "0987654321"). Blank means none ({@code null}).
     *
     * @throws IllegalArgumentException when what is left is not 9-15 digits (maybe after a "+")
     */
    public static String normalizePhone(String phone) {
        if (phone == null || phone.isBlank()) {
            return null;
        }
        String digits = SEPARATORS.matcher(phone.strip()).replaceAll("");
        if (!PHONE.matcher(digits).matches()) {
            throw new IllegalArgumentException("Not a phone number: " + phone);
        }
        return digits;
    }
}
