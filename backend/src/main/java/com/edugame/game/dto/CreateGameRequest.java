package com.edugame.game.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * @param title optional; defaults to "{template name} mới"
 * @param grade optional; must fit the education level (TIEU_HOC: 1-5)
 */
public record CreateGameRequest(
        @NotBlank @Size(max = 50) String templateCode,
        @Size(max = 255) @Pattern(regexp = "(?s).*\\S.*", message = "must not be blank") String title,
        Short grade) {
}
