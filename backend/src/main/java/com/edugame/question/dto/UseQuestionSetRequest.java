package com.edugame.question.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/** The game to make from the set: a quiz game (multiple choice questions) or Lật ô (every question). */
public record UseQuestionSetRequest(
        @NotNull @Pattern(regexp = "QUIZ|GOLDEN_BELL|BOAT_RACE|GRID_BOARD", message = "not a question game")
        String templateCode) {
}
