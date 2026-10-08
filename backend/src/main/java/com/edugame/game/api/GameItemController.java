package com.edugame.game.api;

import com.edugame.game.dto.AddGameItemsRequest;
import com.edugame.game.dto.GameResponse;
import com.edugame.game.dto.ReorderGameItemsRequest;
import com.edugame.game.dto.UpdateGameItemRequest;
import com.edugame.game.service.GameItemService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Items of the version being edited. Each call returns the whole game: editing a published game creates a new
 * draft whose items get new ids, so clients replace their item list with the returned one.
 */
@Tag(name = "Game items", description = "Questions / card sets / wheel segments of a game")
@RestController
@RequestMapping("/api/v1/games/{code}/items")
@RequiredArgsConstructor
public class GameItemController {

    private final GameItemService gameItemService;

    @Operation(summary = "Append one or more items (also used for bulk paste)")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public GameResponse add(@PathVariable String code, @Valid @RequestBody AddGameItemsRequest request) {
        return gameItemService.addItems(code, request);
    }

    @Operation(summary = "Edit an item (omitted fields are left unchanged)")
    @PatchMapping("/{itemId}")
    public GameResponse update(@PathVariable String code, @PathVariable Long itemId,
                               @Valid @RequestBody UpdateGameItemRequest request) {
        return gameItemService.updateItem(code, itemId, request);
    }

    @Operation(summary = "Delete an item; the following items move up")
    @DeleteMapping("/{itemId}")
    public GameResponse delete(@PathVariable String code, @PathVariable Long itemId) {
        return gameItemService.deleteItem(code, itemId);
    }

    @Operation(summary = "Reorder items; the body lists every item id in the new order")
    @PutMapping("/order")
    public GameResponse reorder(@PathVariable String code, @Valid @RequestBody ReorderGameItemsRequest request) {
        return gameItemService.reorderItems(code, request);
    }
}
