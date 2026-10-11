package com.edugame.auth.service;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

import com.edugame.auth.domain.EmailVerification;
import com.edugame.auth.domain.VerificationPurpose;
import com.edugame.auth.mail.AuthMail;
import com.edugame.auth.repository.EmailVerificationRepository;
import com.edugame.common.config.AppProperties;
import com.edugame.common.exception.BusinessException;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 6-digit codes mailed to prove an address is the user's: issuing (with per-address limits, so the form cannot
 * be used to flood a mailbox) and checking (newest code only, limited guesses, one use).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailVerificationService {

    /** Pending sign-ups older than this cannot get a new code; the user fills in the form again. */
    private static final Duration PENDING_FOR = Duration.ofDays(1);

    private final EmailVerificationRepository verificationRepository;
    private final ApplicationEventPublisher events;
    private final AppProperties appProperties;

    /** What the client may show: how long the code works and when another one can be asked for. */
    public record Sent(Duration codeTtl, Duration resendAfter) {
    }

    public enum Outcome { VERIFIED, WRONG_CODE, EXPIRED }

    /**
     * @param payload      of the verified code, when {@code VERIFIED}
     * @param attemptsLeft guesses left, when {@code WRONG_CODE}
     */
    public record Checked(Outcome outcome, JsonNode payload, int attemptsLeft) {
    }

    /** Mails a new code; it replaces earlier ones. */
    @Transactional
    public Sent sendCode(String email, VerificationPurpose purpose, JsonNode payload) {
        String code = newCode();
        save(email, purpose, Secrets.sha256Hex(code), payload);
        events.publishEvent(new AuthMail.VerificationCode(email, purpose, code, properties().codeTtl().toMinutes()));
        return sent();
    }

    /**
     * Sign-up with an address that already has an account: tells its owner instead of sending a code. Recorded and
     * limited like a code, so the answer and timing do not reveal that the address is taken.
     */
    @Transactional
    public Sent sendAccountExists(String email) {
        save(email, VerificationPurpose.REGISTER, Secrets.sha256Hex(newCode()), null);
        events.publishEvent(new AuthMail.AccountExists(email));
        return sent();
    }

    /**
     * A request for an address that cannot get a code (no active account): nothing is mailed, but it is recorded
     * and limited like a real one, so the answer does not reveal which addresses have accounts.
     */
    @Transactional
    public Sent recordWithoutMail(String email, VerificationPurpose purpose) {
        save(email, purpose, Secrets.sha256Hex(newCode()), null);
        return sent();
    }

    /** Payload of the newest code if it can still be re-sent: not used and issued recently. */
    @Transactional(readOnly = true)
    public Optional<JsonNode> pendingPayload(String email, VerificationPurpose purpose) {
        Instant now = Instant.now();
        return verificationRepository.findFirstByEmailAndPurposeOrderByCreatedAtDescIdDesc(email, purpose)
                .filter(v -> v.getPayload() != null && v.getConsumedAt() == null)
                .filter(v -> v.getCreatedAt().plus(PENDING_FOR).isAfter(now))
                .map(EmailVerification::getPayload);
    }

    /** Checks a code against the newest one of the address. Wrong guesses are counted (and committed). */
    @Transactional
    public Checked check(String email, VerificationPurpose purpose, String code) {
        Instant now = Instant.now();
        int maxAttempts = properties().maxAttempts();
        EmailVerification verification = verificationRepository
                .findFirstForUpdateByEmailAndPurposeOrderByCreatedAtDescIdDesc(email, purpose)
                .orElse(null);
        if (verification == null || !verification.isUsable(now, maxAttempts)) {
            return new Checked(Outcome.EXPIRED, null, 0);
        }
        if (!Secrets.matches(Secrets.sha256Hex(code), verification.getCodeHash())) {
            verification.recordWrongGuess();
            int left = maxAttempts - verification.getAttempts();
            return left > 0 ? new Checked(Outcome.WRONG_CODE, null, left) : new Checked(Outcome.EXPIRED, null, 0);
        }
        verification.consume(now);
        return new Checked(Outcome.VERIFIED, verification.getPayload(), maxAttempts - verification.getAttempts());
    }

    @Scheduled(cron = "0 40 3 * * *", zone = "${app.time-zone}")
    @Transactional
    public void deleteExpiredCodes() {
        int deleted = verificationRepository.deleteExpiredBefore(Instant.now().minus(PENDING_FOR));
        if (deleted > 0) {
            log.info("Deleted {} expired verification codes", deleted);
        }
    }

    /** One mail per cooldown and at most {@code max-sends-per-hour} per address; 429 otherwise. */
    private void save(String email, VerificationPurpose purpose, String codeHash, JsonNode payload) {
        Instant now = Instant.now();
        AppProperties.Verification limits = properties();
        verificationRepository.findFirstByEmailAndPurposeOrderByCreatedAtDescIdDesc(email, purpose)
                .filter(latest -> latest.getCreatedAt().plus(limits.resendCooldown()).isAfter(now))
                .ifPresent(latest -> {
                    throw new BusinessException(HttpStatus.TOO_MANY_REQUESTS, "RESEND_TOO_SOON",
                            "Wait %d s before asking for another code".formatted(
                                    Duration.between(now, latest.getCreatedAt().plus(limits.resendCooldown()))
                                            .toSeconds() + 1));
                });
        long lastHour = verificationRepository.countByEmailAndPurposeAndCreatedAtAfter(email, purpose,
                now.minus(Duration.ofHours(1)));
        if (lastHour >= limits.maxSendsPerHour()) {
            throw new BusinessException(HttpStatus.TOO_MANY_REQUESTS, "TOO_MANY_CODES",
                    "Too many codes for this address, try again later");
        }
        verificationRepository.save(EmailVerification.issue(email, purpose, codeHash, payload,
                now.plus(limits.codeTtl())));
    }

    /** The usual answer to a send, also given when nothing was sent so callers cannot tell the difference. */
    public Sent sent() {
        return new Sent(properties().codeTtl(), properties().resendCooldown());
    }

    private AppProperties.Verification properties() {
        return appProperties.auth().verification();
    }

    private static String newCode() {
        return "%06d".formatted(Secrets.RANDOM.nextInt(1_000_000));
    }
}
