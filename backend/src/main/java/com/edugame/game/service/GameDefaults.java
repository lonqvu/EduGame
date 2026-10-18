package com.edugame.game.service;

import com.edugame.user.dto.UserSettings;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

/**
 * The teacher's defaults ("Cài đặt" → new games) written into the settings a new game starts with. A rule is only
 * changed where the game's template has it, so a game never gets a rule it does not play by: teams only where the
 * class is split at random (not Lật ô, whose teams are set by hand, nor Rung chuông vàng, played alone), a time
 * only for timed games, and so on.
 */
final class GameDefaults {

    private GameDefaults() {
    }

    static void apply(ObjectNode config, UserSettings.GameDefaults defaults) {
        JsonNode rules = config.path("rules");
        if (defaults.teams() != null && rules.path("participants") instanceof ObjectNode participants
                && participants.has("teams") && "RANDOM".equals(participants.path("assign").asText())) {
            participants.put("teams", defaults.teams());
        }
        if (defaults.timeLimitSec() != null && config.has("timeLimitSec")) {
            config.put("timeLimitSec", defaults.timeLimitSec());
        }
        if (defaults.allowSteal() != null && rules.path("scoring") instanceof ObjectNode scoring
                && scoring.has("allowSteal")) {
            scoring.put("allowSteal", defaults.allowSteal());
        }
        if (defaults.shuffleItems() != null && config.has("shuffleItems")) {
            config.put("shuffleItems", defaults.shuffleItems());
        }
    }
}
