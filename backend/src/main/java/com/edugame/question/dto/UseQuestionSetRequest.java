package com.edugame.question.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * The game to make from the set: a quiz game (multiple choice questions) or Lật ô (every question).
 *
 * @param title optional name of the game; defaults to the set's title
 */
public record UseQuestionSetRequest(
        @NotNull @Pattern(regexp = "QUIZ|GOLDEN_BELL|BOAT_RACE|GRID_BOARD|MILLIONAIRE|TUG_OF_WAR|FLOWER_PICK|WHACK_MOLE"
                + "|TRUE_FALSE|LUCKY_STAR|SECRET_PICTURE|MOUNTAIN_CLIMB|POINT_WHEEL", message = "not a question game")
        String templateCode,
        @Size(max = 255) @Pattern(regexp = "(?s).*\\S.*", message = "must not be blank") String title) {
}
