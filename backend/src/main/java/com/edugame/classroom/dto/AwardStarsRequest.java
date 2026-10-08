package com.edugame.classroom.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * @param points stars to give, or take away when negative; never 0
 * @param reason e.g. "Thắng game", "Phát biểu hay"
 */
public record AwardStarsRequest(
        @NotNull @Min(-100) @Max(100) Integer points,
        @Size(max = 100) String reason) {
}
