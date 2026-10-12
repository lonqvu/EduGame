package com.edugame.question.dto;

import java.time.Instant;

/** A game made from a set. */
public record QuestionSetGameResponse(String code, String title, String templateCode, Instant createdAt) {
}
