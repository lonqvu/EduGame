package com.edugame.user.service;

import java.util.Iterator;
import java.util.Map;
import java.util.Optional;

import com.edugame.user.domain.User;
import com.edugame.user.dto.UserSettings;
import com.edugame.user.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * "Cài đặt": stored as one JSON object in {@code users.settings}. Reading fills every key the stored object lacks
 * with its default, so settings added later need no migration, and a stored value that no longer reads (a type
 * changed) falls back to the defaults instead of breaking the app.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserSettingsService {

    private final CurrentUserService currentUserService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public UserSettings get() {
        return settingsOf(currentUserService.getCurrentUser());
    }

    @Transactional
    public UserSettings update(UserSettings settings) {
        User user = currentUserService.getCurrentUser();
        UserSettings complete = settings.sound() != null ? settings : settings.withSound(settingsOf(user).sound());
        user.setSettings(objectMapper.valueToTree(complete));
        return settingsOf(user);
    }

    /** Where to send the security mails of a user and which ones they want; empty without an email address. */
    @Transactional(readOnly = true)
    public Optional<MailRecipient> mailRecipient(Long userId) {
        return userRepository.findById(userId)
                .filter(user -> user.getEmail() != null && !user.getEmail().isBlank())
                .map(user -> new MailRecipient(user.getEmail(), settingsOf(user).notifications()));
    }

    public UserSettings settingsOf(User user) {
        ObjectNode merged = objectMapper.valueToTree(UserSettings.DEFAULTS);
        JsonNode stored = user.getSettings();
        if (stored != null && stored.isObject()) {
            mergeInto(merged, stored);
        }
        try {
            return objectMapper.treeToValue(merged, UserSettings.class);
        } catch (JsonProcessingException | IllegalArgumentException e) {
            log.warn("Settings of user {} do not read, using the defaults: {}", user.getCode(), e.getMessage());
            return UserSettings.DEFAULTS;
        }
    }

    public record MailRecipient(String email, UserSettings.Notifications notifications) {
    }

    /** Copies the stored values over the defaults, section by section (a section is never replaced whole). */
    private static void mergeInto(ObjectNode target, JsonNode source) {
        for (Iterator<Map.Entry<String, JsonNode>> it = source.fields(); it.hasNext(); ) {
            Map.Entry<String, JsonNode> field = it.next();
            JsonNode existing = target.get(field.getKey());
            if (existing instanceof ObjectNode section && field.getValue().isObject()) {
                mergeInto(section, field.getValue());
            } else if (existing == null || !existing.isObject()) {
                target.set(field.getKey(), field.getValue());
            }
        }
    }
}
