package com.edugame.user.service;

import java.security.SecureRandom;
import java.text.Normalizer;
import java.time.Instant;
import java.util.Locale;
import java.util.Optional;

import com.edugame.common.exception.BusinessException;
import com.edugame.user.domain.User;
import com.edugame.user.domain.UserStatus;
import com.edugame.user.dto.UserAccount;
import com.edugame.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Creates the accounts of teachers who signed up (module auth checks the email first). */
@Service
@RequiredArgsConstructor
public class UserRegistrationService {

    private static final String CODE_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
    private static final int CODE_LENGTH = 10;
    private static final int USERNAME_MAX = 50;
    private static final int DISPLAY_NAME_MAX = 100;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;

    /** Whether an account (in any status, deleted ones included) already uses this email, in any letter case. */
    @Transactional(readOnly = true)
    public boolean emailInUse(String email) {
        return userRepository.findByEmailIgnoreCase(email).isPresent();
    }

    /**
     * A new active teacher whose email has just been verified. The username is made from the email ("colan" for
     * colan@truong.edu.vn, "colan2" when taken); sign-in works with either.
     *
     * @throws BusinessException 409 {@code EMAIL_TAKEN} if the email got an account meanwhile
     */
    @Transactional
    public UserAccount createVerifiedTeacher(String email, String displayName, String passwordHash) {
        if (emailInUse(email)) {
            throw emailTaken();
        }
        User user = User.verifiedTeacher(newCode(), newUsername(email), passwordHash, displayName.strip(), email,
                Instant.now());
        try {
            return UserAccountService.toAccount(userRepository.saveAndFlush(user));
        } catch (DataIntegrityViolationException ex) {
            // uq_users_email_lower: someone registered the same address at the same time.
            throw emailTaken();
        }
    }

    /**
     * The account of a Google user whose ID token has been verified (module auth), in this order:
     * <ol>
     *   <li>the account already linked to this Google account;</li>
     *   <li>the account with the same email: Google verified the address, so it is linked;</li>
     *   <li>otherwise a new active teacher, without a password.</li>
     * </ol>
     *
     * @param sub         {@code sub} of the ID token, the stable id of the Google account
     * @param email       verified email of the Google account, lower case
     * @param displayName name at Google; {@code null} or blank: made from the email
     * @throws BusinessException 403 {@code ACCOUNT_DISABLED} (locked or deleted account), 409 {@code EMAIL_TAKEN}
     *                           (the address belongs to an account linked to another Google account)
     */
    @Transactional
    public UserAccount findOrCreateGoogleTeacher(String sub, String email, String displayName) {
        Instant now = Instant.now();
        Optional<User> linked = userRepository.findByGoogleSub(sub);
        User user;
        if (linked.isPresent()) {
            user = linked.get();
        } else {
            Optional<User> sameEmail = userRepository.findByEmailIgnoreCase(email);
            if (sameEmail.isPresent()) {
                user = requireActive(sameEmail.get());
                if (user.getGoogleSub() != null) {
                    throw emailTaken();
                }
                user.linkGoogle(sub, now);
            } else {
                user = createGoogleTeacher(sub, email, displayName, now);
            }
        }
        return UserAccountService.toAccount(requireActive(user));
    }

    private static User requireActive(User user) {
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "ACCOUNT_DISABLED", "This account is locked or deleted");
        }
        return user;
    }

    private User createGoogleTeacher(String sub, String email, String displayName, Instant now) {
        String name = displayName == null || displayName.isBlank()
                ? email.substring(0, email.indexOf('@'))
                : displayName.strip();
        name = name.substring(0, Math.min(name.length(), DISPLAY_NAME_MAX));
        User user = User.googleTeacher(newCode(), newUsername(email), name, email, sub, now);
        try {
            return userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException ex) {
            // uq_users_email_lower / uq_users_google_sub: the same sign-in ran twice at the same time.
            throw emailTaken();
        }
    }

    private String newCode() {
        String code;
        do {
            StringBuilder builder = new StringBuilder("u-");
            for (int i = 0; i < CODE_LENGTH; i++) {
                builder.append(CODE_ALPHABET.charAt(RANDOM.nextInt(CODE_ALPHABET.length())));
            }
            code = builder.toString();
        } while (userRepository.existsByCode(code));
        return code;
    }

    /** Local part of the email, reduced to {@code a-z 0-9 . _ -}, plus a number when taken. */
    private String newUsername(String email) {
        String local = email.substring(0, email.indexOf('@'));
        String base = Normalizer.normalize(local, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('đ', 'd').replace('Đ', 'd')
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9._-]", "");
        if (base.length() < 3) {
            base = "giaovien" + base;
        }
        base = base.substring(0, Math.min(base.length(), USERNAME_MAX - 4));
        String username = base;
        for (int n = 2; userRepository.existsByUsername(username); n++) {
            username = base + n;
        }
        return username;
    }

    private static BusinessException emailTaken() {
        return new BusinessException(HttpStatus.CONFLICT, "EMAIL_TAKEN", "This email already has an account");
    }
}
