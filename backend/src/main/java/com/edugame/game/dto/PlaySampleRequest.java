package com.edugame.game.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** "Chơi ngay" on a game type: its sample game. */
public record PlaySampleRequest(@NotBlank @Size(max = 50) String templateCode) {
}
