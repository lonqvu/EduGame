package com.edugame.auth.domain;

/** Values of {@code email_verification.purpose} (ck_email_verification_purpose). */
public enum VerificationPurpose {
    /** Confirms the address of a new account; payload holds the account to create. */
    REGISTER,
    /** Proves the owner of the address before setting a new password; payload holds the user code. */
    RESET_PASSWORD
}
