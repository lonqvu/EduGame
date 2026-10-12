package com.edugame.question.dto;

/**
 * The game made from a set.
 *
 * @param questionCount questions copied into it
 * @param skippedCount  questions it cannot play (short answers in a quiz game)
 */
public record UsedQuestionSetResponse(String gameCode, String templateCode, int questionCount, int skippedCount) {
}
