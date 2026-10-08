package com.edugame.game.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

/** Items are appended after the existing ones, in this order (one item, or a bulk paste). */
public record AddGameItemsRequest(
        @NotEmpty @Size(max = 200) List<@Valid CreateGameItemRequest> items) {
}
