package com.edugame.game.dto;

import java.util.List;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

/** Every item id of the game, in the new order. */
public record ReorderGameItemsRequest(
        @NotEmpty List<@NotNull Long> itemIds) {
}
