package com.edugame.game.service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.edugame.catalog.domain.GameTemplate;
import com.edugame.catalog.service.GameTemplateService;
import com.edugame.common.exception.BusinessException;
import com.edugame.common.exception.ResourceNotFoundException;
import com.edugame.game.domain.Game;
import com.edugame.game.domain.GameItem;
import com.edugame.game.domain.GameStatus;
import com.edugame.game.domain.GameVersion;
import com.edugame.game.dto.CreateGameRequest;
import com.edugame.game.dto.GameResponse;
import com.edugame.game.dto.GameSummaryResponse;
import com.edugame.game.dto.UpdateGameRequest;
import com.edugame.game.mapper.GameMapper;
import com.edugame.game.repository.GameItemRepository;
import com.edugame.game.repository.GameRepository;
import com.edugame.game.repository.GameVersionRepository;
import com.edugame.game.repository.GameVersionRepository.GameItemCount;
import com.edugame.user.domain.User;
import com.edugame.user.service.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * A teacher's games and their versions.
 * <p>
 * Edits always go to the game's DRAFT version. Editing a published game first copies the published version
 * into a new DRAFT ({@link #getOrCreateDraft}); the published version is never changed, so sessions that
 * played it keep their content.
 */
@Service
@RequiredArgsConstructor
public class GameService {

    private static final String CODE_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
    private static final int CODE_LENGTH = 10;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final GameRepository gameRepository;
    private final GameVersionRepository gameVersionRepository;
    private final GameItemRepository gameItemRepository;
    private final GameTemplateService gameTemplateService;
    private final CurrentUserService currentUserService;
    private final GameMapper gameMapper;

    @Transactional(readOnly = true)
    public List<GameSummaryResponse> listMyGames() {
        List<Game> games = gameRepository.findByOwnerAndStatusNotOrderByUpdatedAtDesc(
                currentUserService.getCurrentUser(), GameStatus.ARCHIVED);
        if (games.isEmpty()) {
            return List.of();
        }
        Map<Long, Long> itemCounts = gameVersionRepository
                .countItemsOfLatestVersions(games.stream().map(Game::getId).toList()).stream()
                .collect(Collectors.toMap(GameItemCount::getGameId, GameItemCount::getItemCount));
        return games.stream()
                .map(game -> gameMapper.toSummary(game, itemCounts.getOrDefault(game.getId(), 0L)))
                .toList();
    }

    @Transactional
    public GameResponse create(CreateGameRequest request) {
        User owner = currentUserService.getCurrentUser();
        GameTemplate template = gameTemplateService.getAvailable(request.templateCode());
        String title = request.title() != null ? request.title().strip() : template.getName() + " mới";

        Game game = Game.create(newCode(), owner, template, title, request.grade());
        requireGradeFits(game, request.grade());
        gameRepository.save(game);

        GameVersion draft = gameVersionRepository.save(GameVersion.draft(
                game, 1, template.getSchemaVersion(), template.getDefaultConfig().deepCopy()));
        game.setCurrentVersion(draft);
        return toResponse(game, draft);
    }

    @Transactional(readOnly = true)
    public GameResponse get(String code) {
        Game game = getOwnedGame(code);
        return toResponse(game, latestVersion(game));
    }

    /**
     * The game with a DRAFT to edit, created now if the game is published. The editor opens games with this, so
     * item ids stay the same for the whole editing session.
     */
    @Transactional
    public GameResponse openDraft(String code) {
        Game game = getOwnedGame(code);
        return toResponse(game, getOrCreateDraft(game).version());
    }

    @Transactional
    public GameResponse update(String code, UpdateGameRequest request) {
        Game game = getOwnedGame(code);
        if (request.title() != null) {
            game.setTitle(request.title().strip());
        }
        if (request.description() != null) {
            game.setDescription(blankToNull(request.description()));
        }
        if (request.subject() != null) {
            game.setSubject(blankToNull(request.subject()));
        }
        if (request.grade() != null) {
            requireGradeFits(game, request.grade());
            game.setGrade(request.grade());
        }

        GameVersion editing = latestVersion(game);
        if (request.settings() != null) {
            if (!request.settings().isObject()) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_SETTINGS",
                        "settings must be a JSON object");
            }
            editing = getOrCreateDraft(game).version();
            editing.setSettings(request.settings());
        }
        return toResponse(game, editing);
    }

    /** Soft delete. */
    @Transactional
    public void archive(String code) {
        getOwnedGame(code).archive();
    }

    @Transactional
    public GameResponse publish(String code) {
        Game game = getOwnedGame(code);
        GameVersion latest = latestVersion(game);
        if (!latest.isDraft()) {
            throw new BusinessException(HttpStatus.CONFLICT, "NOTHING_TO_PUBLISH",
                    "Game %s has no unpublished changes".formatted(code));
        }
        game.publish(latest, Instant.now());
        return toResponse(game, latest);
    }

    /** A game of the current user that is not archived; 404 otherwise (does not reveal other teachers' games). */
    @Transactional(readOnly = true)
    public Game getOwnedGame(String code) {
        User user = currentUserService.getCurrentUser();
        return gameRepository.findByCode(code)
                .filter(game -> game.isOwnedBy(user) && game.getStatus() != GameStatus.ARCHIVED)
                .orElseThrow(() -> new ResourceNotFoundException("Game", code));
    }

    /**
     * The DRAFT version to edit. If the game has none (it is published), copies the published version and its
     * items into a new DRAFT; {@link Draft#copiedItems} then maps each old item id to its copy, so a request
     * made with the published item ids still finds the right item.
     */
    @Transactional
    public Draft getOrCreateDraft(Game game) {
        GameVersion latest = latestVersion(game);
        if (latest.isDraft()) {
            return new Draft(latest, Map.of());
        }
        GameVersion draft = gameVersionRepository.save(GameVersion.draft(
                game, latest.getVersion() + 1, latest.getSchemaVersion(), latest.getSettings().deepCopy()));
        Map<Long, GameItem> copies = new HashMap<>();
        for (GameItem item : gameItemRepository.findByGameVersionOrderByPosition(latest)) {
            copies.put(item.getId(), gameItemRepository.save(item.copyTo(draft)));
        }
        return new Draft(draft, copies);
    }

    GameResponse toResponse(Game game, GameVersion editing) {
        return gameMapper.toResponse(game, editing, gameItemRepository.findByGameVersionOrderByPosition(editing));
    }

    private GameVersion latestVersion(Game game) {
        return gameVersionRepository.findFirstByGameOrderByVersionDesc(game)
                .orElseThrow(() -> new IllegalStateException("Game %s has no version".formatted(game.getCode())));
    }

    private static void requireGradeFits(Game game, Short grade) {
        if (!game.getEducationLevel().allowsGrade(grade)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_GRADE",
                    "Grade %s does not fit education level %s".formatted(grade, game.getEducationLevel()));
        }
    }

    private static String blankToNull(String value) {
        return value.isBlank() ? null : value.strip();
    }

    private static String newCode() {
        StringBuilder code = new StringBuilder("g-");
        for (int i = 0; i < CODE_LENGTH; i++) {
            code.append(CODE_ALPHABET.charAt(RANDOM.nextInt(CODE_ALPHABET.length())));
        }
        return code.toString();
    }

    /** @param copiedItems old item id → its copy, only when this call created the draft */
    public record Draft(GameVersion version, Map<Long, GameItem> copiedItems) {
    }
}
