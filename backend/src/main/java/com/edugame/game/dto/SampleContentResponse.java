package com.edugame.game.dto;

import java.util.List;

/**
 * Built-in sample content of a game type, as is: what a visitor who has not signed in plays (nothing is saved).
 */
public record SampleContentResponse(String templateCode, String title, String subject, List<CreateGameItemRequest> items) {
}
