package com.edugame.question.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * The game to make from the set: a quiz game (multiple choice questions) or Lật ô (every question).
 *
 * @param title the game's name; the set's title when absent
 */
public record UseQuestionSetRequest(
        @NotNull @Pattern(regexp = "QUIZ|GOLDEN_BELL|BOAT_RACE|GRID_BOARD", message = "not a question game")
        String templateCode,
        @Size(max = 255) @Pattern(regexp = QuestionSetRules.NOT_BLANK, message = "must not be blank") String title) {
}
