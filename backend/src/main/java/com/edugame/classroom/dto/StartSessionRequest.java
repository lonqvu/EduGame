package com.edugame.classroom.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** @param gameCode a game of the teacher, played with the class now */
public record StartSessionRequest(@NotBlank @Size(max = 30) String gameCode) {
}
