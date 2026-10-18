package com.edugame.auth.service;

import java.time.Instant;

import com.edugame.auth.mail.AuthMail;
import com.edugame.auth.repository.KnownDeviceRepository;
import com.edugame.user.service.UserSettingsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

/**
 * Security mails the teacher can turn off in "Cài đặt" → Thông báo: a sign-in on a new browser, a changed password.
 * They are sent after the request commits and never make it fail (see AuthMailer).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SignInAlerts {

    private final KnownDeviceRepository knownDeviceRepository;
    private final UserSettingsService userSettingsService;
    private final ApplicationEventPublisher events;

    /**
     * Notes the browser of a sign-in among the user's devices. With {@code alertIfNew} (a password sign-in), mails
     * the user when it is one they never used, unless it is their first known device. Never fails the sign-in: a
     * problem is logged and nothing is mailed.
     */
    public void afterSignIn(Long userId, String userAgent, boolean alertIfNew) {
        String device = DeviceNames.of(userAgent);
        if (device == null) {
            return;
        }
        try {
            boolean isNew = alertIfNew && knownDeviceRepository.existsByUserId(userId)
                    && !knownDeviceRepository.existsByUserIdAndDevice(userId, device);
            knownDeviceRepository.remember(userId, device);
            if (isNew) {
                userSettingsService.mailRecipient(userId)
                        .filter(to -> to.notifications().newSignInEmail())
                        .ifPresent(to -> events.publishEvent(new AuthMail.NewSignIn(to.email(), device, Instant.now())));
            }
        } catch (RuntimeException e) {
            log.warn("Could not note the device of a sign-in of user {}", userId, e);
        }
    }

    /** Inside the password change transaction: mailed once it commits. */
    public void passwordChanged(Long userId) {
        userSettingsService.mailRecipient(userId)
                .filter(to -> to.notifications().passwordChangedEmail())
                .ifPresent(to -> events.publishEvent(new AuthMail.PasswordChanged(to.email(), Instant.now())));
    }
}
