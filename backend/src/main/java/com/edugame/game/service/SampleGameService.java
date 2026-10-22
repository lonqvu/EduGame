package com.edugame.game.service;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.edugame.common.exception.BusinessException;
import com.edugame.game.domain.Game;
import com.edugame.game.domain.GameStatus;
import com.edugame.game.dto.AddGameItemsRequest;
import com.edugame.game.dto.CreateGameItemRequest;
import com.edugame.game.dto.CreateGameRequest;
import com.edugame.game.dto.GameResponse;
import com.edugame.game.repository.GameRepository;
import com.edugame.user.domain.User;
import com.edugame.user.repository.UserRepository;
import com.edugame.user.service.CurrentUserService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * "Chơi ngay": every question game type has built-in sample content ({@code samples/sample-games.json}), so a
 * teacher plays at once without writing anything. The first time, the sample is copied into a game of the teacher's
 * (marked {@code sample}); later the same game is played again. It goes through the usual game and item services, so
 * the sample content is checked like any content a teacher types.
 */
@Service
@RequiredArgsConstructor
public class SampleGameService {

    private static final String SAMPLES = "samples/sample-games.json";

    private final GameRepository gameRepository;
    private final UserRepository userRepository;
    private final GameService gameService;
    private final GameItemService gameItemService;
    private final CurrentUserService currentUserService;
    private final ObjectMapper objectMapper;

    /** Sample content of one game type, as in the JSON file. */
    record Sample(String title, String subject, List<CreateGameItemRequest> items) {
    }

    private volatile Map<String, Sample> samples;

    /**
     * The teacher's sample game of this type, made now if there is none (or it was archived).
     *
     * @throws BusinessException 400 {@code NO_SAMPLE} for a game type without sample content (tools)
     */
    @Transactional
    public GameResponse playSample(String templateCode) {
        Sample sample = samples().get(templateCode);
        if (sample == null) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "NO_SAMPLE",
                    "No sample content for %s".formatted(templateCode));
        }
        User owner = currentUserService.getCurrentUser();
        // Two quick clicks must not make two sample games: requests of one teacher wait for each other here.
        userRepository.lockById(owner.getId());
        Optional<Game> existing = gameRepository.findFirstByOwnerAndTemplate_CodeAndSampleTrueAndStatusNot(owner, templateCode,
                GameStatus.ARCHIVED);
        if (existing.isPresent()) {
            return gameService.get(existing.get().getCode());
        }

        GameResponse created = gameService.create(new CreateGameRequest(templateCode, sample.title(), null));
        Game game = gameService.getOwnedGame(created.code());
        game.setSample(true);
        game.setSubject(sample.subject());
        return gameItemService.addItems(created.code(), new AddGameItemsRequest(sample.items()));
    }

    private Map<String, Sample> samples() {
        Map<String, Sample> loaded = samples;
        if (loaded == null) {
            try (InputStream in = new ClassPathResource(SAMPLES).getInputStream()) {
                loaded = Map.copyOf(objectMapper.readValue(in, new TypeReference<Map<String, Sample>>() { }));
            } catch (IOException e) {
                throw new IllegalStateException("Cannot read " + SAMPLES, e);
            }
            samples = loaded;
        }
        return loaded;
    }
}
