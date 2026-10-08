package com.edugame.game.api;

import java.util.List;

import com.edugame.game.dto.CreateGameRequest;
import com.edugame.game.dto.GameResponse;
import com.edugame.game.dto.GameSummaryResponse;
import com.edugame.game.dto.UpdateGameRequest;
import com.edugame.game.service.GameService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Games", description = "The teacher's game library")
@RestController
@RequestMapping("/api/v1/games")
@RequiredArgsConstructor
public class GameController {

    private final GameService gameService;

    @Operation(summary = "My games, most recently edited first")
    @GetMapping
    public List<GameSummaryResponse> list() {
        return gameService.listMyGames();
    }

    @Operation(summary = "Create a game from a template (DRAFT, settings copied from the template)")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public GameResponse create(@Valid @RequestBody CreateGameRequest request) {
        return gameService.create(request);
    }

    @Operation(summary = "A game with the settings and items of the version being edited")
    @GetMapping("/{code}")
    public GameResponse get(@PathVariable String code) {
        return gameService.get(code);
    }

    @Operation(summary = "Open the game for editing: same as GET, but creates the DRAFT now if the game is published")
    @PostMapping("/{code}/draft")
    public GameResponse openDraft(@PathVariable String code) {
        return gameService.openDraft(code);
    }

    @Operation(summary = "Rename / change details or settings (null fields are left unchanged)")
    @PatchMapping("/{code}")
    public GameResponse update(@PathVariable String code, @Valid @RequestBody UpdateGameRequest request) {
        return gameService.update(code, request);
    }

    @Operation(summary = "Archive a game (soft delete)")
    @DeleteMapping("/{code}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void archive(@PathVariable String code) {
        gameService.archive(code);
    }

    @Operation(summary = "Publish the draft: freeze it and make it the version that is played")
    @PostMapping("/{code}/publish")
    public GameResponse publish(@PathVariable String code) {
        return gameService.publish(code);
    }
}
