package com.edugame.auth.mail;

import com.edugame.auth.domain.VerificationPurpose;

/**
 * Mails of module auth, published as application events inside the transaction that decides them and sent by
 * {@link AuthMailer} once it commits.
 */
public sealed interface AuthMail {

    String email();

    /** A one-time code to type into the app. */
    record VerificationCode(String email, VerificationPurpose purpose, String code, long validMinutes)
            implements AuthMail {

        /** Keeps the code out of logs. */
        @Override
        public String toString() {
            return "VerificationCode[email=%s, purpose=%s]".formatted(email, purpose);
        }
    }

    /** Someone tried to sign up with an address that already has an account. */
    record AccountExists(String email) implements AuthMail {
    }
}
