package com.edugame.game.service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import com.edugame.common.exception.BusinessException;
import com.edugame.common.exception.ResourceNotFoundException;
import com.edugame.game.domain.Game;
import com.edugame.game.domain.GameItem;
import com.edugame.game.dto.AddGameItemsRequest;
import com.edugame.game.dto.CreateGameItemRequest;
import com.edugame.game.dto.GameResponse;
import com.edugame.game.dto.ReorderGameItemsRequest;
import com.edugame.game.dto.UpdateGameItemRequest;
import com.edugame.game.repository.GameItemRepository;
import com.edugame.game.service.GameService.Draft;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Items (questions, card sets, wheel segments...) of the version being edited. Positions are always 0..n-1.
 * Every method returns the whole game, because item ids change when the edit creates a new draft.
 */
@Service
@RequiredArgsConstructor
public class GameItemService {

    static final int MAX_ITEMS = 200;

    private final GameService gameService;
    private final GameItemRepository gameItemRepository;
    private final GameItemValidator gameItemValidator;

    @Transactional
    public GameResponse addItems(String gameCode, AddGameItemsRequest request) {
        Game game = gameService.getOwnedGame(gameCode);
        Draft draft = gameService.getOrCreateDraft(game);
        int position = gameItemRepository.findByGameVersionOrderByPosition(draft.version()).size();
        if (position + request.items().size() > MAX_ITEMS) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "TOO_MANY_ITEMS",
                    "A game has at most %d items".formatted(MAX_ITEMS));
        }

        for (CreateGameItemRequest item : request.items()) {
            JsonNode solution = nullIfJsonNull(item.solution());
            gameItemValidator.validate(game.getTemplate().getConfigSchema(), item.itemType(), item.content(),
                    solution);
            gameItemRepository.save(GameItem.create(draft.version(), item.itemType(), position++, item.content(),
                    solution, blankToNull(item.explanation())));
        }
        game.touch();
        return gameService.toResponse(game, draft.version());
    }

    @Transactional
    public GameResponse updateItem(String gameCode, Long itemId, UpdateGameItemRequest request) {
        Game game = gameService.getOwnedGame(gameCode);
        Draft draft = gameService.getOrCreateDraft(game);
        GameItem item = findItem(draft, itemId);

        JsonNode content = request.content() != null ? request.content() : item.getContent();
        JsonNode solution = request.solution() != null ? nullIfJsonNull(request.solution()) : item.getSolution();
        gameItemValidator.validate(game.getTemplate().getConfigSchema(), item.getItemType(), content, solution);

        item.setContent(content);
        item.setSolution(solution);
        if (request.explanation() != null) {
            item.setExplanation(blankToNull(request.explanation()));
        }
        game.touch();
        return gameService.toResponse(game, draft.version());
    }

    @Transactional
    public GameResponse deleteItem(String gameCode, Long itemId) {
        Game game = gameService.getOwnedGame(gameCode);
        Draft draft = gameService.getOrCreateDraft(game);
        GameItem removed = findItem(draft, itemId);

        List<GameItem> remaining = new ArrayList<>(gameItemRepository.findByGameVersionOrderByPosition(draft.version()));
        remaining.remove(removed);
        gameItemRepository.deferPositionCheck();
        gameItemRepository.delete(removed);
        renumber(remaining);
        game.touch();
        return gameService.toResponse(game, draft.version());
    }

    @Transactional
    public GameResponse reorderItems(String gameCode, ReorderGameItemsRequest request) {
        Game game = gameService.getOwnedGame(gameCode);
        Draft draft = gameService.getOrCreateDraft(game);
        List<GameItem> current = gameItemRepository.findByGameVersionOrderByPosition(draft.version());

        List<GameItem> ordered = request.itemIds().stream().map(id -> findItem(draft, id)).toList();
        Set<GameItem> distinct = new HashSet<>(ordered);
        if (distinct.size() != ordered.size() || !distinct.equals(new HashSet<>(current))) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_ITEM_ORDER",
                    "itemIds must list every item of the game exactly once");
        }
        gameItemRepository.deferPositionCheck();
        renumber(ordered);
        game.touch();
        return gameService.toResponse(game, draft.version());
    }

    /** Finds an item of the draft, also by the id it had in the published version it was just copied from. */
    private GameItem findItem(Draft draft, Long itemId) {
        GameItem copy = draft.copiedItems().get(itemId);
        if (copy != null) {
            return copy;
        }
        return gameItemRepository.findById(itemId)
                .filter(item -> item.getGameVersion().equals(draft.version()))
                .orElseThrow(() -> new ResourceNotFoundException("Game item", itemId));
    }

    private static void renumber(List<GameItem> items) {
        for (int i = 0; i < items.size(); i++) {
            items.get(i).setPosition(i);
        }
    }

    /** {@code "solution": null} arrives as a JSON null node; the column wants SQL NULL. */
    private static JsonNode nullIfJsonNull(JsonNode node) {
        return node == null || node.isNull() ? null : node;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
