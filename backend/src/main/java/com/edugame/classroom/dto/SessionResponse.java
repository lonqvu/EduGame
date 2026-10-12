package com.edugame.classroom.dto;

import java.time.Instant;

import com.edugame.play.domain.GameSessionStatus;

/** A game played with a class. */
public record SessionResponse(Long id, String gameCode, GameSessionStatus status, Instant startedAt, Instant endedAt) {
}
