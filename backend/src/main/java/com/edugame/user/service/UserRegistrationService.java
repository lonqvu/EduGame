package com.edugame.user.service;

import java.security.SecureRandom;
import java.text.Normalizer;
import java.time.Instant;
import java.util.Locale;

import com.edugame.common.exception.BusinessException;
import com.edugame.user.domain.User;
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
