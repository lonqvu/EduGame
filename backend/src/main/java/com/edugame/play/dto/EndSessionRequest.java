package com.edugame.play.dto;

import jakarta.validation.Valid;

/** Body of "the class reached the results screen"; may be left out (older clients, tools). */
public record EndSessionRequest(@Valid GameResults results) {
}
